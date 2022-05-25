const url = 'http://localhost:8090';
const socket = io(url)
let pendingTransaction = [];
let publicKeys = new Map();
let miningData = null;

startUp();

function startUp(){
    console.log("dashboard script loaded !");
    document.getElementById("mt_from_field").value = window.name;
    const p = JSON.parse(httpGet('/publickeys'));
    for(let i = 0; i < p.length; i++){
        addUser(p[i]);
    }
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
    addTransaction(data, pendingTransaction.length);
    pendingTransaction.push(data);
})

socket.on('invalid-transaction', (data) => {
    if(isTransactionValid(data)) return;

    let i = getIndexOfTransaction(data);
    if(i < 0) return;

    if(data.from == window.name)
        alert("One of your transaction has been invalidated");
    removeTransaction(i);
})

socket.on('mined-transaction', (data) => {

    let i =  getIndexOfTransaction(data);

    alert(i + "has been mined (but not checked yet)");

    if(i < 0) return;
    removeTransaction(i);
})

socket.on('new-user', (data) => {
    addUser(data);
})

function addUser(user){
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
    console.log("finding ", data, "in", pendingTransaction);

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
    miningData = pendingTransaction[i]
    document.getElementById("mining").style.visibility = 'visible';

    if(isTransactionValid(pendingTransaction[i])){
        socket.emit('mined-transaction', pendingTransaction[i]);
        removeTransaction(i);
    }else{
        socket.emit('invalid-transaction', pendingTransaction[i]);
        removeTransaction(i);
    }
}

function closeMining(){
    document.getElementById("mining").style.visibility = 'hidden';
    //reset everything else here
}

function submitMining(){
    alert("submitted mining")
}

function isTransactionValid(data){
    return data.amount <= 200.00;
}

function removeTransaction(i){
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

    const mlAfterPadding = BigInt( bitLength(message) );
    let ml = mlAfterPadding - (mlAfterPadding + 64n)%512n + 512n;
    let blocks = demcomposeToArr(message + mlBeforePadding * 2n** ml, bitsPerBlock, ml+64n);

    // init
    let h0 = BigInt(0x67452301);
    let h1 = BigInt(0xEFCDAB89);
    let h2 = BigInt(0x98BADCFE);
    let h3 = BigInt(0x10325476);
    let h4 = BigInt(0xC3D2E1F0);

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
    }

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
    const ver = modPow(signature, publicKey.d, publicKey.n);
    return (ver == getTransactionHex(transaction)%publicKey.n);
}