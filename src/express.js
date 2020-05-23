/*
  *
  *******  part1.환경설정 *******
  *
*/
var express = require('express');
var port = process.env.PORT || 3000;
var ejs = require('ejs');
var request = require('request');//request
var app = express();

app.use(express.static(__dirname + '/public'));//express
app.use(express.json());
app.use(express.urlencoded({extended:false}));

app.set('views', __dirname + '/views');//ejs
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

/*
  *
  *******  part2.프론트-화면 렌더링 *******
  *
*/
//2-1. 메인
app.get('/index', function (req, res) {
    res.render('index')
})
app.get('/main', function (req, res) {
    res.render('main')
})
/*
  *
  *******  part3.프론트-화면 렌더링 *******
  *
*/
app.post('/getComment', function(req, res) {
    var linkURLs = new Array();
    linkURLs = req.body.cmtArr;
    console.log(linkURLs);

    res.json("success")
})
//3.$. 서버처리-대기
app.listen(3000);
console.log("Listening on port", port);
