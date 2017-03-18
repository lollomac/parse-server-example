/*
var express = require('express');
var app = express();

app.use(express.bodyParser());

app.get('/', function(req, res) {
  console.log(req);
  res.send('It works!');
});

app.get(['/facebook', '/instagram'], function(req, res) {
  if (
    req.param('hub.mode') == 'subscribe' &&
    req.param('hub.verify_token') == 'token'
    console.log("subscribe");
  ) {
    res.send(req.param('hub.challenge'));
    console.log("hub.challenge");
  } else {
    console.log("send");
    res.send(400);
  }
});

app.post('/facebook', function(req, res) {
  console.log('Facebook request body:');
  console.log(req.body);
  // Process the Facebook updates here
  res.send(200);
});

app.post('/instagram', function(req, res) {
  console.log('Instagram request body:');
  console.log(req.body);
  // Process the Instagram updates here
  res.send(200);
});

app.listen();
*/


Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});
