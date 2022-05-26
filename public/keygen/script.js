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
function getKeyPair( primeBits = 512){
    // get 2 large prime numbers
    const p = getPrime(primeBits);
    document.getElementById("p").value = p.toString(16);

    const q = getPrime(primeBits);
    document.getElementById("q").value = q.toString(16);
    
    // n's only prime decomposition is p*q
    const n = p * q;
    document.getElementById("n").value = n.toString(16);

    const l = (p-1n)*(q-1n) / gcd((p-1n), (q-1n)); // = lcd(p-1, q-1)
    document.getElementById("l").value = l.toString(16);

    // get e such that e and l are coprime
    let e = 2n**16n + 1n;
    while(gcd(l, e) != 1n) 
        e += 2n;
    
    document.getElementById("e").value = e.toString(16);

    // get d such that de=1(mod l)
    const d = toModed(modInv(e, l), l);
    document.getElementById("d").value = d.toString(16);

    // console.log("Key Gen:", "\np:", p.toString(16), "\nq:", q.toString(16),
    //             "\nn:", n.toString(16), "\nl:", l.toString(16), "\ne:",
    //             e.toString(16), "\nd:", d.toString(16));

    return {private: {d, n}, public: {e, n}}
}


function show() {
    const x = document.getElementById("submitButton");
    x.style.display = "block";
}

function hide() {
    const x = document.getElementById("submitButton");
    x.style.display = "none";
}

hide();

window.addEventListener('load', function () {
    getKeyPair();

    show();
})
