var port = (process.env.PORT || 8001);

var express = require('express');
var app = express();

var Imap = require('imap');
var inspect = require('util').inspect;

var MailParser = require("mailparser").MailParser;

app.get('/', function(req, res){
    res.send('Hello World!');
});

app.get('/:host/:port/:security/:authMethod/:user/:pass', function(req, res){
    var msgs ={};

    var imap = new Imap({
        user: req.params.user,
        password: req.params.pass,
        host: req.params.host,
        port: req.params.port,
        tls: false
    });
    
    function openInbox(cb){
        imap.openBox('INBOX', true, cb);
    }

    imap.once('ready', function(){
        openInbox(function(err, box){
            if (err) throw err;
            console.log('aaaa');
            console.log(box.messages.total);
            console.log('aaaa');
            var f = imap.seq.fetch('1:' + box.messages.total,{
                bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
                struct: true
            });
            
            f.on('message', function(msg, seqno){
                var message ={
                    'id': seqno,
                    'from':{},
                    'to':{},
                    'date': '',
                    'subject': '',
                    'uid': '',
                    'modseq': '',
                    'seen': false,
                    '_href': ''
                };

                msg.on('body', function(stream, info){
                    var buffer = '';
                    stream.on('data', function(chunk){buffer += chunk.toString('utf8');});
                    stream.once('end', function(){
                        var header = Imap.parseHeader(buffer);
                        message.from = header.from[0];
                        message.to = header.to[0];
                        message.date = header.date[0];
                        message.subject = header.subject[0];
                    });
                });
                msg.once('attributes', function(attrs){
                    message.uid = attrs.uid;
                    message.modseq = attrs.modseq;

                    for(var i in attrs.flags){
                        var f = attrs.flags[i];
                        if(f == '\\Seen'){message.seen = true;}
                    }

                    message._href = '/' + req.params.host + '/' + req.params.port + '/' + req.params.security + '/' + req.params.authMethod + '/' + req.params.user + '/' + req.params.pass + '/' + message.id;
                });
                msg.once('end', function(){
                    msgs[message.uid] = message;
                });
            });
            f.once('error', function(err){
                console.log('Fetch error: ' + err);
            });
            f.once('end', function(){
                console.log('Done fetching all messages!');
                imap.end();
            });
        });
    });

    imap.once('error', function(err){
        console.log(err);
    });

    imap.once('end', function(){
        res.send(JSON.stringify(msgs, 0, 4));
    });
 
    imap.connect();
});

app.get('/:host/:port/:security/:authMethod/:user/:pass/:uid', function(req, res){
    var email = {};
    var raw = '';

    var imap = new Imap({
        user: req.params.user,
        password: req.params.pass,
        host: req.params.host,
        port: req.params.port,
        tls: false
    });
    
    function openInbox(cb){
        imap.openBox('INBOX', true, cb);
    }

    imap.once('ready', function(){
        openInbox(function(err, box){
            if (err) throw err;
            var f = imap.seq.fetch(req.params.uid, {bodies: ['']});
            f.on('message', function(msg, seqno){
                msg.on('body', function(stream, info){
                    var buffer = '';
                    var count = 0;
                    stream.on('data', function(chunk){
                        count += chunk.length;
                        buffer += chunk.toString('utf8');
                    });
                    stream.once('end', function(){
                        raw = buffer;
                    });
                });
                msg.once('attributes', function(attrs){
                    
                });
                msg.once('end', function(){

                });
            });
            f.once('error', function(err){
                
            });
            f.once('end', function(){
                var mailparser = new MailParser({});

                mailparser.on("end", function(mail_object){
                    email = mail_object;
                    imap.end();
                });

                mailparser.write(raw);
                mailparser.end();
            });
        });
    });

    imap.once('error', function(err){
        console.log(err);
    });

    imap.once('end', function(){
        res.send(JSON.stringify(email, 0, 4));
    });
 
    imap.connect();
});

app.listen(port, function(){
    console.log('Example app listening on port ' + port + '!');
});