import { doesSignatureMatch, getTransactionFromNum, signTransaction, SHA160, getKeyPair } from "/scripts/cryptobigint";

console.log("dashboard script loaded");

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