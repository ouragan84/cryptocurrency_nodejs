
console.log("crypto-helper script loaded");

// # Pre generated primes
const first_primes_list = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29,
                     31, 37, 41, 43, 47, 53, 59, 61, 67,
                     71, 73, 79, 83, 89, 97, 101, 103,
                     107, 109, 113, 127, 131, 137, 139,
                     149, 151, 157, 163, 167, 173, 179,
                     181, 191, 193, 197, 199, 211, 223,
                     227, 229, 233, 239, 241, 251, 257,
                     263, 269, 271, 277, 281, 283, 293,
                     307, 311, 313, 317, 331, 337, 347, 349]
 
function nBitRandom(bits){
    try{
        return generateRandomBigInt(2n**(bits-1n)+1n, 2n**bits - 1n)
    }catch{
        return nBitRandom(bits);
    }
    
}

/** Generates BigInts between low (inclusive) and high (exclusive) */
function generateRandomBigInt(lowBigInt, highBigInt) {
    if (lowBigInt >= highBigInt) {
      throw new Error('lowBigInt must be smaller than highBigInt');
    }
  
    const difference = highBigInt - lowBigInt;
    const differenceLength = difference.toString().length;
    let multiplier = '';
    while (multiplier.length < differenceLength) {
      multiplier += Math.random()
        .toString()
        .split('.')[1];
    }
    multiplier = multiplier.slice(0, differenceLength);
    const divisor = '1' + '0'.repeat(differenceLength);
  
    const randomDifference = (difference * BigInt(multiplier)) / BigInt(divisor);
  
    return lowBigInt + randomDifference;
}
  
function getLowLevelPrime(bits){
    // '''Generate a prime candidate divisible  by first primes'''
    while (true){
        // # Obtain a random number
        let pc = nBitRandom(bits)
 
        //  # Test divisibility by pre-generated primes
        let found = true;
        for(let i = 0; i < first_primes_list.length; ++i){
            if(pc % BigInt( first_primes_list[i]) == 0n && BigInt( first_primes_list[i])**2n <= pc){
                found = false;
                break;
            }
        }
        if(found) return pc;
    }
}
 
function isMillerRabinPassed(mrc){
    let maxDivisionsByTwo = 0n
    let ec = mrc-1n
    while (ec % 2n == 0n){
        ec >>= 1n
        maxDivisionsByTwo += 1n
    }

    const trialComposite = (round_tester) => {
        if ( modPow(round_tester,ec,mrc) == 1n)
            return false
        for(let i = 0n; i < maxDivisionsByTwo; ++i){
            if (modPow(round_tester, (2n**i * ec), mrc) == mrc - 1n)
                return false
        }
        return true
    }
 
    // # Set number of trials here
    const numberOfRabinTrials = 20n;

    for (let i = 0n; i < numberOfRabinTrials; ++i){
        let round_tester = generateRandomBigInt(2n, mrc);
        if (trialComposite(round_tester))
            return false
    }
    return true
}
    
// returns 
function getPrime(bits){
    while(true){
        let prime_candidate = getLowLevelPrime( BigInt(bits) )
        if (isMillerRabinPassed(prime_candidate))
            return prime_candidate;
    }
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

// returns the gdc of a and b
function gcd (a, b) {

    if (a === 0n) {
      return b
    } else if (b === 0n) {
      return a
    }
  
    let shift = 0n
    while (((a | b) & 1n) === 0n) {
      a >>= 1n
      b >>= 1n
      shift++
    }
    while ((a & 1n) === 0n) a >>= 1n
    do {
      while ((b & 1n) === 0n) b >>= 1n
      if (a > b) {
        const x = a
        a = b
        b = x
      }
      b -= a
    } while (b !== 0n)
  
    // rescale
    return a << shift
}

// returns x such that ax=1(mod b) using euclid algo
function modInv (a, b) {
    if (a <= 0n || b <= 0n) throw new RangeError('a and b MUST be > 0') // a and b MUST be positive
  
    let x = 0n;
    let y = 1n;
    let u = 1n;
    let v = 0n;
  
    while (a !== 0n) {
      const q = b / a
      const r = b % a
      const m = x - (u * q)
      const n = y - (v * q)
      b = a
      a = r
      x = u
      y = v
      u = m
      v = n
    }
    return x;
}

// generates a pk/sk pair in the form {private: {d, n}, public: {e, n}}
export function getKeyPair( primeBits = 512){
    // get 2 large prime numbers
    const p = getPrime(primeBits);
    const q = getPrime(primeBits);

    // n's only prime decomposition is p*q
    const n = p * q;
    const l = (p-1n)*(q-1n) / gcd((p-1n), (q-1n)); // = lcd(p-1, q-1)

    // get e such that e and l are coprime
    let e = 2n**16n + 1n;
    while(gcd(l, e) != 1n) 
        e += 2n;

    // get d such that de=1(mod l)
    const d = toModed(modInv(e, l), l);

    // console.log("Key Gen:", "\np:", p.toString(16), "\nq:", q.toString(16),
    //             "\nn:", n.toString(16), "\nl:", l.toString(16), "\ne:",
    //             e.toString(16), "\nd:", d.toString(16));

    return {private: {d, n}, public: {e, n}}
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
export function SHA160(message){
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

export function signTransaction(rawTransaction, privateKey){
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
    transactionHex += BigInt.asUintN(tNumLength, BigInt(Math.floor(rawTransaction.tNum)));

    const transactionSignature = modPow(transactionHex, privateKey.e, privateKey.n);

    return {transaction: transactionHex, signature: transactionSignature};
}

export function getTransactionFromNum(transaction){
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

    return {from: from, to: to, amount:amount, tNum: tNum};
}   

export function doesSignatureMatch(transaction, signature, publicKey){
    const ver = modPow(signature, publicKey.d, publicKey.n);
    return (ver == transaction%publicKey.n);
}


// const edgarKeys = getKeyPair();
// const alisonKeys = getKeyPair();

// const nameToPKMap = new Map();

// nameToPKMap.set("edgar", edgarKeys.public);
// nameToPKMap.set("alsion", alisonKeys.public);

// const rawTransaction = {
//     from: "edgar",
//     to: "alison",
//     amount: 420.69,
//     tNum: 6778
// };

// const t = signTransaction(rawTransaction, edgarKeys.public);

// console.log("transaction:",t.transaction.toString(16));
// console.log("signature:",t.signature.toString(16)); 

// const verification = doesSignatureMatch(t.transaction, t.signature, edgarKeys.private);
// console.log("signature match:", verification);

// const recoveredTransaction = getTransactionFromNum(t.transaction);
// console.log("recovered:", recoveredTransaction);