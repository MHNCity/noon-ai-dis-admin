const crypto = require('crypto');
// const { writeFileSync } = require('fs');

function generateKeyPair() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: "spki",
            format: "pem",
        },
        privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
            // cipher: "aes256",
            // passphrase: 'nicepikbro'
        },
    });

    return {
        'privateKey': privateKey,
        'publicKey': publicKey
    }
}

module.exports = {
    generateKeyPair
}