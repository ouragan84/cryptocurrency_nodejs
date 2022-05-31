const url = 'http://localhost:8090';
const socket = io(url)
let pendingTransaction = [];
let blockChain = [];
let publicKeys = new Map();
let isMining = false;
let verificationMap = new Map();

startUp();

//ADD GET BC
function startUp(){
    console.log("dashboard script loaded !");
    document.getElementById("mt_from_field").value = window.name;
    const p = JSON.parse(httpGet('/publickeys'));
    for(let i = 0; i < p.length; i++){
        addUser(p[i]);
    }
    
    pendingTransaction = JSON.parse(httpGet('/transactions'));
    document.getElementById('pendingList').innerHTML = "";
    for(let j = 0; j < pendingTransaction.length; j++){
        addTransaction(pendingTransaction[j], j);
    }
    
    const allBlockChains = JSON.parse(httpGet('/blockchain'));
    var longestBC = null;
    var longestVerification;

    allBlockChains.forEach(bc => {
        if(longestBC == null || bc.length > longestBC.length){
            const v = verifyAndUpdateBlockChain(bc);
            if(v.isValid){
                longestVerification = v.verification;
                longestBC = bc;
            }
        } 
    });

    updateToBlockChain(longestBC, longestVerification);

    

    updateSignature();
}

function httpGet(endPoint)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url+endPoint, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

socket.on('new-transaction', (data) => {
    let numNext = verificationMap.get(data.from).nextNum;

    if(parseInt(data.number) < numNext){
        socket.emit('invalid-transaction', data);
        removeTransaction(data);
        return;
    }

    //keep newest if other have same number
    pendingTransaction.forEach(t => {
        if(t.from == data.from && parseInt(t.number) == parseInt(data.number)){
            socket.emit('invalid-transaction', t);
            removeTransaction(t);
        }
    });

    addTransaction(data, pendingTransaction.length);
    pendingTransaction.push(data);
})

// IMPLEMENT
socket.on('invalid-transaction', (data) => {

    console.log("got invalid");

    let numNext = verificationMap.get(data.from).nextNum;
    let funds = verificationMap.get(data.from).funds;

    if(parseInt(data.number) < numNext || parseFloat(data.amount) > funds){

        console.log("a transaction has been deemed invalid by someone else")
        removeTransaction(data);

        if(window.name == data.from){
            updateFormNumberAndInvalidateMyWrongNumberTransactions();
            alert("One of your transactions has been invalidated")
        }
        return;
    }
})

socket.on('update-blockchain', (data) => {
    
    if(data.blockChain.length > blockChain.length){
        const v = verifyAndUpdateBlockChain(data.blockChain);
        if(v.isValid)
            updateToBlockChain(data.blockChain, v.verification);
    }      

})

socket.on('new-user', (data) => {
    addUser(data);
    verificationMap.set(data.name, {nextNum: 0, funds: 200})
    console.log("new user registered");
})

function verifyAndUpdateBlockChain(bc){
    let verification = new Map();

    publicKeys.forEach((value, key, map) => {
        verification.set(key, {funds:200, nextNum:0})
    });

    console.log("verification map: ", verification);

    for(let i = 0; i < bc.length; ++i){
        if(i > 0 && BigInt("0x"+bc[i].previous) != BigInt("0x"+ bc[i-1].hash)){
            // console.log("prev != prev hash so hell nah")
            return {isValid: false, verification:null}; //prev != prev hash so hell nah
        }

        if(BigInt("0x"+bc[i].hash) != SHA160(getBlockHex(bc[i]).h)){
            // console.log("prev != prev hash so hell nah")
            return {isValid: false, verification:null}; // hash not the same, hell nah
        }
            
        if(verification.get(bc[i].from) == null){
            // console.log("user " +  bc[i].from + " don't exist, bad blockchain")
            return {isValid: false, verification:null}; //user don't exist, bad blockchain
        }
            
        if(parseInt(bc[i].number) != verification.get(bc[i].from).nextNum){
            // console.log("bad number = bad blockchain")
            return {isValid: false, verification:null}; // bad number = bad blockchain
        }else
            verification.get(bc[i].from).nextNum ++;

        verification.get(bc[i].to).funds += parseFloat(bc[i].amount);

        if(parseInt(bc[i].amount) > verification.get(bc[i].from).funds){
            // console.log("overdrawn = bad blockchain")
            return {isValid: false, verification:null}; //overdrawn = bad blockchain
        }else
            verification.get(bc[i].from).funds -= parseFloat(bc[i].amount)
        

        verification.get(bc[i].miner).funds += 10;

        // console.log("verification map: ", verification);
    }

    return {isValid: true, verification:verification}
}

function updateToBlockChain(bc, verification){
    document.getElementById("block_chain").innerHTML = "";
    blockChain = [];
    bc.forEach(element => {
        addBlock(element)
    });

    verificationMap = verification;

    pendingTransaction.forEach(t => {
        if(t.number < verificationMap.get(t.from).nextNum){
            removeTransaction(t);
        }
        else if(t.amount > verificationMap.get(t.from).funds){
            removeTransaction(t);
            socket.emit('invalid-transaction', t);
        }
    });

    verificationMap.forEach((value, key, map) => {
        deleteTransactionsWithNumUnder(key, value.nextNum);//implement
    });

    document.getElementById("funds").innerText = verificationMap.get(window.name).funds.toFixed(2);
    updateFormNumberAndInvalidateMyWrongNumberTransactions();

    scrollToEndOfBC();
}

function scrollToEndOfBC(){
    var objDiv = document.getElementById("block_chain");

    // console.log(1.0 * objDiv.scrollLeft / objDiv.scrollWidth)

    setTimeout(() => {
        objDiv.scrollTo({top: 0,
            left: objDiv.scrollWidth,
            behavior: 'smooth'});
    }, 200);  
}

function addUser(user){
    if(publicKeys.get(user.name) != null) return;
    document.getElementById("mt_to_field").innerHTML += "<option value=" + user.name + ">" + user.name + "</option>";
    publicKeys.set(
        user.name,
        {
            e:BigInt("0x"+user.key.e),
            n:BigInt("0x"+user.key.n)
        }
    )

    console.log(publicKeys)
}

function updateFormNumberAndInvalidateMyWrongNumberTransactions(){

    let numNext = verificationMap.get(window.name).nextNum;
    let funds = verificationMap.get(window.name).funds;
    
    // console.log("current num and funds", numNext, funds)

    let myPendingTransactions = [];
    let deleting = false;

    pendingTransaction.forEach(t => {
        if(t.from == window.name){
            // console.log(parseInt(t.number));
            if(parseInt(t.number) < numNext){ // || parseFloat(element.amount) > funds
                deleting = true;
                socket.emit('invalid-transaction', t);
                removeTransaction(t);
            }else{
                myPendingTransactions.push(t);
            }
        }
    });

    myPendingTransactions.sort(function(a, b) {
        return  parseInt(a.number) - parseInt(b.number);
      });

    for(let i = 0; i < myPendingTransactions.length; i++){
        if(parseInt(myPendingTransactions[i].number) == numNext){
            numNext++;
            continue;
        }
    }

    document.getElementById("mt_number_field").value = numNext;
    // verificationMap.get(window.name).nextNum = numNext;

    if(deleting){
        alert("Some of your old transaction were invalid and were deleted")
    }

}

function deleteTransactionsWithNumUnder(user, num){
    pendingTransaction.forEach(t => {
        if(t.from == user && t.number < num){
            removeTransaction(t)
        }
    });
}

function removeTransaction(data){
    console.log("called to remove transaction")

    for(let j = 0; j < pendingTransaction.length; j++){
        if(data.from == pendingTransaction[j].from
            && data.to == pendingTransaction[j].to
            && data.amount == pendingTransaction[j].amount
            && data.number == pendingTransaction[j].number
            && data.signature == pendingTransaction[j].signature)
        { // 0 1 2 3 4 |5| 6 7     len=8
            pendingTransaction = pendingTransaction.slice(0, j).concat( pendingTransaction.slice(j + 1, pendingTransaction.length) )
        }
    }

    document.getElementById('pendingList').innerHTML = "";
    for(let j = 0; j < pendingTransaction.length; j++){
        addTransaction(pendingTransaction[j], j);
    }
}

function addTransaction(data, i){

    document.getElementById('pendingList').innerHTML +=
    "<div class=\"pendingTrans\">" + 
        "<div class=\"transactionInfos\">     "+
        "    <div class=\"transactionProperty\">     "+
        "        <label class=\"TransInlineLabel\" >From:</label>     "+
        "        <input class=\"TransInlineField\" type=\"text\" value=\"" + data.from + "\" readonly>     "+
        "    </div>     "+

        "    <div class=\"transactionProperty\">     "+
        "        <label class=\"TransInlineLabel\" >To:</label>     "+
        "        <input class=\"TransInlineField\" type=\"text\" value=\"" + data.to + "\"  readonly>     "+
        "    </div>     "+

        "    <div class=\"transactionProperty\">     "+
        "        <label class=\"TransInlineLabel\" >Amount:</label>     "+
        "        <input class=\"TransInlineField\" type=\"text\" value=\"" + data.amount + "\"  readonly>     "+
        "    </div>     "+

        "    <div class=\"transactionProperty\">     "+
        "        <label class=\"TransInlineLabel\" >Number:</label>     "+
        "        <input class=\"TransInlineField\" type=\"text\" value=\"" + data.number + "\" readonly>     "+
        "    </div>     "+

        "    <hr class=\"new\">     "+

        "    <div class=\"transactionProperty\">     "+
        "        <label class=\"TransInlineLabel\" >Signature:</label>     "+
        "        <input class=\"TransInlineField\" type=\"text\" value=\"" + data.signature + "\" readonly>     "+
        "    </div>     "+
        "</div>     "+
        "<div class=\"transactionMine\">     "+
        "    <input type=\"button\" value=\"Mine\" class=\"mineButton\" onclick=\"mineTransaction( "+ i+" )\">     " +
        "</div>"+
        
    "</div>";
}

function addBlock(data){
    var doc = document.getElementById('block_chain');

    doc.innerHTML += 
    (blockChain.length > 0? " <img src=\"/img/arrow\" class=\"arrow\"/>": "") + 

   " <div class=\"block\">    " +
   "         <div class=\"blockProperty\">    " +
   "             <label class=\"inlineLabel\" >Previous:</label>    " +
   "             <input class=\"inlineField\" type=\"text\" value=\"" + data.previous + "\" readonly>    " +
   "         </div>    " +
   " " +
   "         <hr class=\"new\">    " +
   " " +
   "         <div class=\"blockProperty\">    " +
   "             <label class=\"inlineLabel\" >From:</label>    " +
   "             <input class=\"inlineField\" type=\"text\" value=\"" + data.from + "\" readonly>    " +
   "         </div>    " +
   " " +
   "         <div class=\"blockProperty\">    " +
   "             <label class=\"inlineLabel\" >To:</label>    " +
   "             <input class=\"inlineField\" type=\"text\" value=\"" + data.to + "\" readonly>    " +
   "         </div>    " +
   " " +
   "         <div class=\"blockProperty\">    " +
   "             <label class=\"inlineLabel\" >Amount:</label>    " +
   "             <input class=\"inlineField\" type=\"text\" value=\"" + data.amount + "\" readonly>    " +
   "         </div>    " +
   " " +
   "         <div class=\"blockProperty\">    " +
   "             <label class=\"inlineLabel\" >Number:</label>    " +
   "             <input class=\"inlineField\" type=\"text\" value=\"" + data.number + "\" readonly>    " +
   "         </div>    " +
   " " +
   "         <hr class=\"new\">    " +
   " " +
   "         <div class=\"blockProperty\">    " +
   "             <label class=\"inlineLabel\" >Signature:</label>    " +
   "             <input class=\"inlineField\" type=\"text\" value=\"" + data.signature + "\" readonly>    " +
   "         </div>    " +
   " " +
   "         <hr class=\"new\">    " +
   " " +
   "         <div class=\"blockProperty\">    " +
   "             <label class=\"inlineLabel\" >Miner:</label>    " +
   "             <input class=\"inlineField\" type=\"text\" value=\"" + data.miner + "\" readonly>    " +
   "         </div>    " +
   " " +
   "         <div class=\"blockProperty\">    " +
   "             <label class=\"inlineLabel\" >Nonce:</label>    " +
   "             <input class=\"inlineField\" type=\"text\" value=\"" + data.nonce + "\" readonly>    " +
   "         </div>    " +
   " " +
   "         <div class=\"blockProperty\">    " +
   "             <label class=\"inlineLabel\" >Hash:</label>    " +
   "             <input class=\"inlineField\" type=\"text\" value=\"" + data.hash + "\" readonly>    " +
   "         </div>    " +
   "     </div>    ";

   blockChain.push(data);
} 

function updateSignature(){
    const transaction = {
        from: document.getElementById("mt_from_field").value,
        to: document.getElementById("mt_to_field").value,
        amount: document.getElementById("mt_amount_field").value,
        number: document.getElementById("mt_number_field").value
    }

    const sig = signTransaction(transaction, window.keys.private);

    document.getElementById("mt_signature_field").value = sig.toString(16);
}

function mineTransaction(i){
    let miningData = pendingTransaction[i]
    miningData.previous = (blockChain.length > 0? blockChain[blockChain.length-1].hash : "0000");

    document.getElementById("mine_submit_button").disabled = true;
    document.getElementById("mine_submit_button").value = "Next";
    document.getElementById("mine_message").innerText = "";

    document.getElementById("mine_previous_field").value =  miningData.previous;// do that
    document.getElementById("mine_from_field").value = miningData.from;
    document.getElementById("mine_to_field").value = miningData.to;
    document.getElementById("mine_amount_field").value = miningData.amount;
    document.getElementById("mine_number_field").value = miningData.number;
    document.getElementById("mine_signature_field").value = miningData.signature;
    document.getElementById("mine_miner_field").value = window.name;
    document.getElementById("mine_nonce_field").value = 0;
    document.getElementById("mine_hash_field").value = "xxxxx";

    Array.prototype.forEach.call(document.getElementsByClassName("checkmarkImage"), function(el) {
        el.style.visibility = 'hidden'
    });

    document.getElementById("mining").style.visibility = 'visible';

    isMining = true;

    setTimeout(() => {
        if(isTransactionNumberValid(miningData))
            setTimeout(() => {
                if(isTransactionFundValid(miningData))
                    setTimeout(() => {
                        if(isTransactionSignatureValid(miningData))
                            setTimeout(() => {
                                tryHashes(0, miningData, 
                                    getBlockHex({
                                        miner: window.name,
                                        nonce: 0,
                                        previous: miningData.previous,
                                        from: miningData.from,
                                        to: miningData.to,
                                        amount: miningData.amount,
                                        number: miningData.number,
                                        signature: miningData.signature,
                                    }
                                ));
                            }, "0")
                    }, "100")
            }, "100")
    }, "100")
    // alert("Mining Sucessful!");
}

function isTransactionFundValid(data){    
    if(!verifyTransactionFund(data) ){
        invalidateTransaction(data, "Funds are not valid (We don't want to waste time mining a block that we know is invalid)", "checkmark_image_funds");
        return false;
    }
    document.getElementById("checkmark_image_funds").src = '/img/checkmark';
    document.getElementById("checkmark_image_funds").style.visibility = 'visible'
    return true;
}

function verifyTransactionFund(data){
    if( !publicKeys.has(data.from)) return false;

    return verificationMap.get(data.from).funds >= parseFloat(data.amount);
}

function isTransactionNumberValid(data){
    const numberValidity =  parseInt(data.number) - verificationMap.get(data.from).nextNum; 
    if( numberValidity >= 0 ){
        if(numberValidity == 0){
            document.getElementById("checkmark_image_num").src = '/img/checkmark';
            document.getElementById("checkmark_image_num").style.visibility = 'visible'
            return true;
        }
        invalidateTransaction(data, "Number is over the one we should expect, but keep transaction in case multiple are pending by the user", "checkmark_image_num", false);
    }else{
        invalidateTransaction(data, "Number is already in block chain or user does not exist", "checkmark_image_num", true);
    }
    return false;
}

function isTransactionSignatureValid(data){
    if( !verifyTransactionSignature(data) ){
        invalidateTransaction(data, "Signature is not valid  (We don't want to waste time mining a block that we know is invalid)", "checkmark_image_sig");
        return false;
    }
    document.getElementById("checkmark_image_sig").src = '/img/checkmark';
    document.getElementById("checkmark_image_sig").style.visibility = 'visible'
    return true;
}

function verifyTransactionSignature(data){
    return doesSignatureMatch(data, BigInt("0x"+data.signature), publicKeys.get(data.from));
}

function verifyPrevious(data, i){
    return i <= 0 || data.previous == blockChain[i-1].hash;
}

function verifyHash(data){
    return true;
}

function invalidateTransaction(data, message, img_id, remove=true){
    document.getElementById("mine_message").style.color = "#ff4444";
    document.getElementById("mine_message").innerText = message;
    document.getElementById(img_id).src = '/img/crossmark';
    document.getElementById(img_id).style.visibility = 'visible'
    document.getElementById("mine_submit_button").value = "Go Back";
    document.getElementById("mine_submit_button").disabled = false;
    if(remove){
        removeTransaction(data);
        socket.emit('invalid-transaction', data);
    }
        
    updateFormNumberAndInvalidateMyWrongNumberTransactions();
}

const zeroBits = 12n;
const shaBits = 160n;
const incrementRender = 100;
const nonceL = 64n;

function tryHashes(i, miningData, blockHex){

    if(blockChain.length > 0 && blockChain[blockChain.length-1].hash != miningData.previous){
        document.getElementById("mine_submit_button").disabled = false;
        document.getElementById("mine_message").innerText = "Recieved a longer blockchain and \"previous\" does not match anymore";
        document.getElementById("mine_submit_button").value = "Go Back";
        document.getElementById("mine_message").style.color = "#ff4444";
        isMining = false;
    }

    if(!isMining) return;

    // test if any other transactions arrived
    let j = i;
    let hash;

    while( j < i + incrementRender ){

        // console.log(bigIntGetStrNBits(blockHex.h, blockHex.n))
        hash = SHA160(blockHex.h);
        // actually want to try hash  bigIntGetStrNBits
        if( hash < 2n ** (shaBits - zeroBits)){
            
            minedBlockSucess(miningData, hash, j);
            isMining = false;
            return;
        }

        ++j;
        blockHex.h = ((blockHex.h >> nonceL) << nonceL) + BigInt.asUintN(Number(nonceL), BigInt(j))
    }

    document.getElementById("mine_nonce_field").value = j-1;
    document.getElementById("mine_hash_field").value = bigIntGetStrNBits(hash, shaBits);

    setTimeout(() => {
        tryHashes(j, miningData, blockHex);
    }, "0")
    
}

function minedBlockSucess(miningData, hash, nonce){
    console.log("mined with success");

    document.getElementById("mine_nonce_field").value = nonce
    document.getElementById("mine_hash_field").value = bigIntGetStrNBits(hash, shaBits)
    document.getElementById("mine_submit_button").disabled = false;
    document.getElementById("mine_message").innerText = "Success! Sent out the updated blockchain to everyone";
    document.getElementById("mine_message").style.color = "#16702e";


    var newBlock = miningData;
    newBlock.miner = window.name;
    newBlock.nonce = nonce;
    newBlock.hash = bigIntGetStrNBits(hash, shaBits);

    if(newBlock.to == window.name){
        document.getElementById("funds").innerText = (parseFloat(document.getElementById("funds").innerText) + 
            parseFloat(newBlock.amount)).toFixed(2) ;
    }
    if(newBlock.miner == window.name){
        document.getElementById("funds").innerText = (parseFloat(document.getElementById("funds").innerText) + 
            10).toFixed(2) ;
    }
    if(newBlock.from == window.name){
        document.getElementById("funds").innerText = (parseFloat(document.getElementById("funds").innerText) - 
            parseFloat(newBlock.amount)).toFixed(2) ;
    }

    
    addBlock(newBlock);
    verificationMap.get(newBlock.from).nextNum++;
    verificationMap.get(newBlock.from).funds -= parseFloat(newBlock.amount);    

    setTimeout(() => {

        const data = {blockChain: blockChain};

        fetch( url+'/blockchain', {
            method: "POST",
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(data)
          }).then(res => {
            console.log("Request complete! response:", res);
          });

        removeTransaction(miningData);  //do I wanna do that ???? I think so...

        scrollToEndOfBC();

    }, "10")
}

function closeMining(){
    isMining = false;
    document.getElementById("mining").style.visibility = 'hidden';
    Array.prototype.forEach.call(document.getElementsByClassName("checkmarkImage"), function(el) {
        el.style.visibility = 'hidden'
    });
    //reset everything else here
}

function submitTransaction() {
    const message = {
        from: document.getElementById("mt_from_field").value,
        to: document.getElementById("mt_to_field").value,
        amount: document.getElementById("mt_amount_field").value,
        number: document.getElementById("mt_number_field").value,
        signature: document.getElementById("mt_signature_field").value
    }

    socket.emit('new-transaction', message);

    addTransaction(message, pendingTransaction.length);
    pendingTransaction.push(message);

    updateFormNumberAndInvalidateMyWrongNumberTransactions();
    updateSignature();

    return;
}

// returns bitlength of bigint
function bitLength (a) {  
    if (a === 1n) { return 1 }
    let bits = 1
    do {
      bits++
    } while ((a >>= 1n) > 1n)
    return bits
}

// makes a positive and less than a while conserving a mod n
function toModed (a, n){  
    if (n <= 0n) {
      throw new RangeError('n must be > 0')
    }
  
    const aZn = a % n
    return (aZn < 0n) ? aZn + n : aZn
}

// returns b^e mod n
function modPow (b, e, n){
    if (n <= 0n) {
      throw new RangeError('n must be > 0')
    } else if (n === 1n) {
      return 0n
    }
  
    b = toModed(b, n)
    let r = 1n
    while (e > 0) {
      if ((e % 2n) === 1n) {
        r = r * b % n
      }
      e = e / 2n
      b = b ** 2n % n
    }
    return r
}

// decompose number into chunks
function demcomposeToArr(message, bitsPerBlock, ml){
    let arr = [];
    let bits = 0n;

    while(ml > bits){
        const takeOff = message % (2n**bitsPerBlock);
        arr.push(takeOff);
        message = (message - takeOff) / (2n**bitsPerBlock);
        bits += bitsPerBlock;
    }

    return arr;
}

//returns a 160bit hash
function SHA160(message){
    const bitsPerBlock = 32n;

    const mlBeforePadding = BigInt( bitLength(message) );

    // console.log("mlBeforePadding", mlBeforePadding)

    const mlAfterPadding = BigInt( bitLength(message) );

    // console.log("mlAfterPadding", mlAfterPadding)

    let ml = mlAfterPadding - (mlAfterPadding + 64n)%512n + 512n;

    // console.log("ml", ml)

    let blocks = demcomposeToArr(message + mlBeforePadding * 2n** ml, bitsPerBlock, ml+64n);

    // console.log("blocks", blocks)

    // init
    let h0 = BigInt("0x67452301");
    let h1 = BigInt("0xEFCDAB89");
    let h2 = BigInt("0x98BADCFE");
    let h3 = BigInt("0x10325476");
    let h4 = BigInt("0xC3D2E1F0");

    let a, b, c, d, e;

    // for each 512 bit chunk
    for(let j = 0; j < blocks.length/16; j++){

        // init hash val for chunk
        a = h0;
        b = h1;
        c = h2;
        d = h3;
        e = h4;

        let w = [];
        for(let i = 0; i < 16; i++){
            w.push(blocks[j*16+i]);
        }
        for(let i = 16; i < 80; i++){
            w.push( BigInt.asUintN(32, (w[i-3]^w[i-8]^w[i-14]^w[i-16]) << 1n));
        }

        // console.log("w", w)

        // shuffle bits arounds
        let f, k;
        for(let i = 0; i < 80; i++){
            // console.log("abcde", bigIntGetStrNBits(a, 32n), bigIntGetStrNBits(b, 32n), 
            //     bigIntGetStrNBits(c, 32n), bigIntGetStrNBits(d, 32n), bigIntGetStrNBits(e, 32n))

            if( 0 <= i && i < 20){
                f = BigInt.asUintN(32, (b&c)|(BigInt.asUintN(32, ~a)&c))
                k = BigInt("0x5A827999");
            }else if( 20<= i && i < 40){
                f = BigInt.asUintN(32, b^c^d)
                k = BigInt("0x6ED9EBA1");
            }else if( 40<= i && i < 60){
                f = BigInt.asUintN(32, (b&c)|(b&d)|(c&d))
                k = BigInt("0x8F1BBCDC");
            }else if( 60<= i && i < 80){
                f = BigInt.asUintN(32, b^c^d)
                k = BigInt("0xCA62C1D6");
            }

            // console.log("ifk", i, bigIntGetStrNBits(f, 32n), bigIntGetStrNBits(k, 32n))

            let temp =  BigInt.asUintN(32, leftrotate(a, 5n, 32) + f + e + k + w[i]);
            e = d;
            d = c;
            c = BigInt.asUintN(32, leftrotate(b, 30n, 32));
            b = a;
            a = temp;            
        }

        // add chunk hash to result
        h0 = BigInt.asUintN(32, h0 + a);
        h1 = BigInt.asUintN(32, h1 + b);
        h2 = BigInt.asUintN(32, h2 + c);
        h3 = BigInt.asUintN(32, h3 + d);
        h4 = BigInt.asUintN(32, h4 + e);

        // console.log("Hvals: ", bigIntGetStrNBits(h0, 32n), bigIntGetStrNBits(h1, 32n), 
        // bigIntGetStrNBits(h2, 32n), bigIntGetStrNBits(h3, 32n), bigIntGetStrNBits(h4, 32n))
    }


    // console.log("Ending Hash: ", bigIntGetStrNBits(BigInt.asUintN(160, 
    //     (h0 << 128n) | (h1 << 96n) | (h2 << 64n) | (h3 << 32n) | h4), 160n))

    return BigInt.asUintN(160, (h0 << 128n) | (h1 << 96n) | (h2 << 64n) | (h3 << 32n) | h4);
}

function leftrotate(a, b, bits){
    return BigInt.asUintN(bits, BigInt.asUintN(bits, a << b) + BigInt.asUintN(bits, a >> (BigInt(bits) - b)));
}

function stringToNum(str, expectedLength){
    let number = 0n;
    for(let i = 0; i < str.length && expectedLength-8*i-8 >= 0 ; i++){
        number += BigInt(str.charCodeAt(i)) * (2n ** BigInt(expectedLength-8*i-8));
    }
    return number;
}

function numToString(number){
    let str = "";
    while(number > 0n){
        const n = number % (2n ** 8n);
        number >>= 8n;
        if(n != 0n){
            str = String.fromCharCode(Number(n)) + str;
        }
    }
    return str;
}

function getBlockHex(rawBlock){
    const prevLength = 160;
    const fromLength = 64 * 8;
    const toLength = 64 * 8;
    const amountLength = 32;
    const tNumLength = 32;
    const sigLength = 1024;
    const minerLength = 64 * 8;
    const nonceLength = 64;

    let blockHex = BigInt.asUintN(prevLength, BigInt("0x"+rawBlock.previous));

    blockHex <<= BigInt(fromLength);
    blockHex += stringToNum(rawBlock.from, fromLength);
    
    blockHex <<= BigInt(toLength);
    blockHex += stringToNum(rawBlock.to, toLength);

    blockHex <<= BigInt(amountLength);
    blockHex += BigInt.asUintN(amountLength, BigInt(Math.floor(rawBlock.amount*100)));

    blockHex <<= BigInt(tNumLength);
    blockHex += BigInt.asUintN(tNumLength, BigInt(Math.floor(rawBlock.number)));

    blockHex <<= BigInt(sigLength);
    blockHex += BigInt.asUintN(sigLength, BigInt("0x" + rawBlock.signature));

    blockHex <<= BigInt(minerLength);
    blockHex += stringToNum(rawBlock.miner, minerLength);

    blockHex <<= BigInt(nonceLength);
    blockHex += BigInt.asUintN(nonceLength, BigInt(Math.floor(rawBlock.nonce)));

    return {h: blockHex, 
        n: BigInt(prevLength+fromLength+toLength+amountLength+
            tNumLength+sigLength+minerLength+nonceLength)};
}

function getTransactionHex(rawTransaction){
    const fromLength = 64 * 8;
    const toLength = 64 * 8;
    const amountLength = 32;
    const tNumLength = 32;

    let transactionHex = stringToNum(rawTransaction.from, fromLength);
    
    transactionHex <<= BigInt(toLength);
    transactionHex += stringToNum(rawTransaction.to, toLength);

    transactionHex <<= BigInt(amountLength);
    transactionHex += BigInt.asUintN(amountLength, BigInt(Math.floor(rawTransaction.amount*100)));

    transactionHex <<= BigInt(tNumLength);
    transactionHex += BigInt.asUintN(tNumLength, BigInt(Math.floor(rawTransaction.number)));

    return transactionHex
}

function signTransaction(rawTransaction, privateKey){
    const t = getTransactionHex(rawTransaction);
    const transactionSignature = modPow(t, privateKey.d, privateKey.n);

    return transactionSignature;
}

function getTransactionFromNum(transaction){
    const fromLength = 64 * 8;
    const toLength = 64 * 8;
    const amountLength = 32;
    const tNumLength = 32;

    const tNum = Number(transaction % (2n ** BigInt(tNumLength)))
    transaction >>= BigInt(tNumLength);

    const amount = Number(transaction % (2n ** BigInt(amountLength))) / 100;
    transaction >>= BigInt(amountLength);

    const to = numToString(transaction %  (2n ** BigInt(toLength)));
    transaction >>= BigInt(toLength);

    const from = numToString(transaction %  (2n ** BigInt(fromLength)));

    return {from: from, to: to, amount:amount, number: tNum};
}   

function doesSignatureMatch(transaction, signature, publicKey){

    const ver = modPow(signature, publicKey.e, publicKey.n);
    return (ver == getTransactionHex(transaction)%publicKey.n);
}

function bigIntGetStrNBits(number, bits){
    const zeros = Math.floor( (Number(bits) - bitLength(number)) / 4 ) ;
    let str = number.toString(16);
    for(let i = 0; i < zeros; i++)
        str = "0"+str;
    return str;
}