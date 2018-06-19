'use strict'


var CryptoJs = require('crypto-js')
var express = require('express')
var bodyparser = require('body-parser')
var WebSocket = require('ws')




var http_port = process.env.http_port || 3001
var p2p_port = process.env.p2p_port || 6009

var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];


//define a block structure as per block chain
class Block {

    constructor(index, previousHash, timestamp, data, hash) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash.toString();
    }
}


var socket = [];
var messageType = {

    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
};


var getGenesisBlock = () => {

    return new Block(0, "0", 14556783, "my genesis block", "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3");
}

var blockchain = [getGenesisBlock()];


//initializing http server

var initHTTPServer = () => {

    var app = express();
    app.use(bodyparser.json());
    app.get('/blocks', (req, res) => res.send(JSON.stringify(blockchain)));
    app.post('/mineBlock', (req, res) => {

        var newBlock = generateNextBlock(req.body.data);
        addBlock(newBlock);
        brodcast(responseLatastMsg());
        console.log('block added:' + JSON.stringify(newBlock));
        res.send();
    });

    app.get('/peers', (req, res) => {

        res.send(socket.map(s => s._socket.remoteAddress + ":" + s._socket.remotePort));

    });


    app.post('/addPeer', (req, res) => {

        connectToPeers([req.body.peer]);
        res.send();

    })

    app.listen(http_port, () =>
        console.log('listening http at port no :' + http_port));

}



//initializing p2p server

var initP2PServer = () => {

    var server = new WebSocket.Server({ port: p2p_port });
    server.on('connection', ws => initConnection(ws));
    console.log('listening websocket on :' + p2p_port);
}


var initConnection = (ws) => {

    soockets.push(ws);

    initMessageHandler(ws);
    initErrorHandler(ws);
    Write(ws.queryChainLengthMsg());
};

//Generating the next block

var generateNextBlock = (blockData) => {

    var previousBlock = getLatestBlock();
    var nextIndex = previousBlock.index + 1;
    var nextTimeStamp = new Date().getTime() / 1000;
    var nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimeStamp, blockData);
    return new Block(nextIndex, previousBlock.hash, nextTimeStamp, blockData, nextHash);

}



//calculating hash of blocks 


var calculateHash = (index, previousHash, timestamp, data) => {

    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();

}

//calculate hash for blocks

var calculateHashForBlock = (block) => {

    return calculateHash(block.index, block.previousBlock, block.timestamp, block.data);
}

//add a block into blockchain
var addBlock = (newBlock) => {

    if (isValidNewBlock(newBlock, getLatestBlock())) {

        blockchain.push(newBlock);
    }
}

var isValidNewBlock = (newBlock, previousBlock) => {
    if (previousBlock.index + 1 != newBlock.index) {
        console.log("invalid index");
        return false;
    }
    else if (previousBlock.hash != newBlock.previousHash) {
        console.log("invalid previoushash")
        return false;
    }
    else if (calculateHashForBlock(newBlock) != newBlock.hash) {
        console.log(typeof calculateHashForBlock(newBlock))
        console.log("invalid hash :" + calculateHashForBlock(newBlock) + newBlock.hash);
        return false
    }
    return true;

}


//generating latest block


var getLatestBlock = () => {

    blockchain[blockchain.length - 1];

    var queryChainLengthMsg = () => ({
        'type': messageType.QUEry_LATEST
    })

    var queryAllMsg = () => ({
        'type': messageType.QUERY_ALL


    });

    var responseChainMsg = () => ({

        'type': messageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(blockchain)

    });

    var responseLatestMsg = () => ({

        'type': messageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(getLatestBlock())

    });


}


var connectToPeers = (newPeers) => {

    newPeers.forEach( function(peer) {

        var ws = new WebSocket(peer)
        ws.on('open', () => initConnection(ws));
        ws.on('error', () => {
            console.log("connection fail")
        });
    });

};

var write = (ws, message) =>
    ws.send(JSON.stringify(message));

var brodcast = (message) => socket.forEach(socket => write(socket.message));
connectToPeers(initialPeers);

initHTTPServer();
initP2PServer();




















