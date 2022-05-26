const url = 'http://localhost:8090';
const socket = io(url)
let pendingTransaction = [];
let blockChain = [];
let publicKeys = new Map();
let isMining = false;

startUp();

//ADD GET BC
function startUp(){
    console.log("dashboard script loaded !");
    document.getElementById("mt_from_field").value = window.name;
    const p = JSON.parse(httpGet('/publickeys'));
    for(let i = 0; i < p.length; i++){
        addUser(p[i]);
    }
    updateSignature();

    SHA160(BigInt("0x000000000000000000000000000123"));
    SHA160(BigInt("0x000000000000000000000000000124"));
}

function httpGet(endPoint)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url+endPoint, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

socket.on('new-transaction', (data) => {
    addTransaction(data, pendingTransaction.length);
    pendingTransaction.push(data);
})

socket.on('invalid-transaction', (data) => {
    if(isTransactionFundValid(data) && isTransactionNumberValid(data) && isTransactionSignatureValid(data)) return;

    if(data.from == window.name)
        alert("One of your transaction has been invalidated");

    removeTransaction(data);
})

//IMPLEMENT
socket.on('mined-block', (data) => {
    // alert("got new block");

    if(!verifyTransactionFund(data) || !verifyTransactionNumber(data) || !verifyTransactionSignature(data) || !verifyPrevious(data, blockChain.length) || !verifyHash(data))
    {
        console.log("recieved transaction did not pass one of the tests")
    }

    removeTransaction(data);
    addBlock(data, blockChain.length);
    blockChain.push(data)

})

socket.on('new-user', (data) => {
    addUser(data);
})

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

function getIndexOfTransaction(data){
    for(let j = 0; j < pendingTransaction.length; j++){
        if(data.from == pendingTransaction[j].from
            && data.to == pendingTransaction[j].to
            && data.amount == pendingTransaction[j].amount
            && data.number == pendingTransaction[j].number
            && data.signature == pendingTransaction[j].signature)
            return j
    }
    return -1;
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

function addBlock(data, i){

    document.getElementById('block_chain').innerHTML += 
    (i > 0? " <img src=\"/img/arrow\" class=\"arrow\"/>": "") + 

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
} 

function updateSignature(){
    const transaction = {
        from: document.getElementById("mt_from_field").value,
        to: document.getElementById("mt_to_field").value,
        amount: document.getElementById("mt_amount_field").value,
        number: document.getElementById("mt_number_field").value,
    }

    const sig = signTransaction(transaction, window.keys.private);

    document.getElementById("mt_signature_field").value = sig.toString(16);
}

function mineTransaction(i){
    let miningData = pendingTransaction[i]
    document.getElementById("mine_submit_button").disabled = true;
    document.getElementById("mine_submit_button").value = "Next";
    document.getElementById("mine_message").innerText = "";

    document.getElementById("mine_previous_field").value = "xxxxx"; // do that
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
        if(isTransactionFundValid(miningData))
            setTimeout(() => {
                if(isTransactionNumberValid(miningData))
                    setTimeout(() => {
                        if(isTransactionSignatureValid(miningData))
                            setTimeout(() => {
                                tryHashes(0, {
                                    previous: "a1b1c1",
                                    miningData
                                }, 
                                    getBlockHex({
                                        previous: "a1b1c1",
                                        from: miningData.from,
                                        to: miningData.to,
                                        amount: miningData.amount,
                                        number: miningData.number,
                                        signature: miningData.signature,
                                        miner: window.name,
                                        nonce: 0
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
        invalidateTransaction(miningData, "Funds are not valid (We don't want to waste time mining a block that we know is invalid)", "checkmark_image_funds");
        return false;
    }
    document.getElementById("checkmark_image_funds").src = '/img/checkmark';
    document.getElementById("checkmark_image_funds").style.visibility = 'visible'
    return true;
}

//IMPLEMENT
function verifyTransactionFund(data){
    if( !publicKeys.has(data.from)) return false;
    return true;
}

function isTransactionNumberValid(data){
    if( !verifyTransactionNumber(data) ){
        invalidateTransaction(data, "Number is not valid  (We don't want to waste time mining a block that we know is invalid)", "checkmark_image_num");
        return false;
    }
    document.getElementById("checkmark_image_num").src = '/img/checkmark';
    document.getElementById("checkmark_image_num").style.visibility = 'visible'
    return true;
}

//IMPLEMENT
function verifyTransactionNumber(data){
    return true;
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

function invalidateTransaction(data, message, img_id){
    socket.emit('invalid-transaction', data);
    document.getElementById("mine_message").style.color = "#ff4444";
    document.getElementById("mine_message").innerText = message;
    document.getElementById(img_id).src = '/img/crossmark';
    document.getElementById(img_id).style.visibility = 'visible'
    document.getElementById("mine_submit_button").value = "Go Back";
    document.getElementById("mine_submit_button").disabled = false;
    removeTransaction(data);
}

const zeroBits = 4n;
const shaBits = 160n;
const incrementRender = 1;
const nonceL = 64n;

function tryHashes(i, miningData, blockHex){

    if(!isMining) return;

    // test if any other transactions arrived
    let j = i;
    let hash;

    while( j < i + incrementRender ){

        console.log(bigIntGetStrNBits(blockHex.h, blockHex.n))
        hash = SHA160(blockHex.h);
        // actually want to try hash  bigIntGetStrNBits
        if( hash < 2n ** (shaBits - zeroBits)){
            
            document.getElementById("mine_nonce_field").value = j
            document.getElementById("mine_hash_field").value = bigIntGetStrNBits(hash, shaBits)
            document.getElementById("mine_submit_button").disabled = false;
            document.getElementById("mine_message").innerText = "Success! Sent out the block to everyone else";
            document.getElementById("mine_message").style.color = "#16702e";

            setTimeout(() => {
                socket.emit('mined-block', {
                        previous: miningData.previous,
                        from: miningData.from,
                        to: miningData.to,
                        amount: miningData.amount,
                        number: miningData.number,
                        signature: miningData.signature,
                        miner: window.name,
                        nonce: j,
                        hash: bigIntGetStrNBits(hash, shaBits)
                });
                removeTransaction(miningData);
            }, "10")

            return;
        }

        ++j;
        blockHex.h = ((blockHex.h >> nonceL) << nonceL) + BigInt.asUintN(Number(nonceL), BigInt(j))
    }

    document.getElementById("mine_nonce_field").value = j-1;
    document.getElementById("mine_hash_field").value = bigIntGetStrNBits(hash, shaBits);

    setTimeout(() => {
        tryHashes(j, miningData, blockHex);
    }, "3000")
    
}

function closeMining(){
    isMining = false;
    document.getElementById("mining").style.visibility = 'hidden';
    Array.prototype.forEach.call(document.getElementsByClassName("checkmarkImage"), function(el) {
        el.style.visibility = 'hidden'
    });
    //reset everything else here
}

function removeTransaction(data){
    const i = getIndexOfTransaction(data);

    pendingTransaction = pendingTransaction.slice(0, i).concat( pendingTransaction.slice(i + 1, pendingTransaction.length))
    document.getElementById('pendingList').innerHTML = "";

    for(let j = 0; j < pendingTransaction.length; j++){
        addTransaction(pendingTransaction[j], j);
    }

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

    console.log("mlBeforePadding", mlBeforePadding)

    const mlAfterPadding = BigInt( bitLength(message) );

    console.log("mlAfterPadding", mlAfterPadding)

    let ml = mlAfterPadding - (mlAfterPadding + 64n)%512n + 512n;

    console.log("ml", ml)

    let blocks = demcomposeToArr(message + mlBeforePadding * 2n** ml, bitsPerBlock, ml+64n);

    console.log("blocks", blocks)

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
            w.push((w[i-3]^w[i-8]^w[i-14]^w[i-16]) << 1n);
        }

        // shuffle bits arounds
        let f, k;
        for(let i = 0; i < 80; i++){
            if( 0<= i < 20){
                f = BigInt.asUintN(32, (b&c)|((~b)&c))
                k = BigInt(0x5A827999);
            }else if( 20<= i < 40){
                f = BigInt.asUintN(32, b^c^d)
                k = BigInt(0x6ED9EBA1);
            }else if( 40<= i < 60){
                f = BigInt.asUintN(32, (b&c)|(b&d)|(c&d))
                k = BigInt(0x8F1BBCDC);
            }else if( 60<= i < 80){
                f = BigInt.asUintN(32, b^c^d)
                k = BigInt(0xCA62C1D6);
            }

            let temp =  BigInt.asUintN(32, (a << 5n) + f + e + k + w[i]);
            e = d;
            d = c;
            c = BigInt.asUintN(32, b << 30n);
            b = a;
            a = temp;
        }

        // add chunk hash to result
        h0 = BigInt.asUintN(32, h0 + a);
        h1 = BigInt.asUintN(32, h1 + b);
        h2 = BigInt.asUintN(32, h2 + c);
        h3 = BigInt.asUintN(32, h3 + d);
        h4 = BigInt.asUintN(32, h4 + e);

        console.log("Hvals: ", bigIntGetStrNBits(h0, 32n), bigIntGetStrNBits(h1, 32n), 
        bigIntGetStrNBits(h2, 32n), bigIntGetStrNBits(h3, 32n), bigIntGetStrNBits(h4, 32n))
    }//bigIntGetStrNBits(hash, shaBits)


    console.log("Ending Hash: ", bigIntGetStrNBits(BigInt.asUintN(160, 
        (h0 << 128n) | (h1 << 96n) | (h2 << 64n) | (h3 << 32n) | h4), 160n))

    return BigInt.asUintN(160, (h0 << 128n) | (h1 << 96n) | (h2 << 64n) | (h3 << 32n) | h4);
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

    let blockHex = BigInt.asUintN(prevLength, BigInt("0x"+rawBlock.previous))

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