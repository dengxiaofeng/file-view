const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const proxy = require('http-proxy-middleware')
const multipart = require('multipart')
const atob = require('atob')
const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')
const webpackHotMiddleware = require('webpack-hot-middleware')
const WebpackConfig = require('./webpack.config')
const path = require('path')


const app = express()
const compiler = webpack(WebpackConfig)
app.use(webpackDevMiddleware(compiler,{
	publicPath: '/__build__/',
	stats:{
		colors:true,
		chunks:false
	}
}))



app.use(webpackHotMiddleware(compiler))

app.use(express.static(__dirname))

const router = express.Router()

// const cors = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Credentials': true,
//   'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
//   'Access-Control-Allow-Headers': 'Content-Type'
// }

router.all('*',function(req, res, next){
	res.header('Access-Control-Allow-Origin','*')
	res.header('Access-Control-Allow-Credentials',true)
	res.header('Access-Control-Allow-Methods','POST, GET, PUT, DELETE, OPTIONS')
	res.header('Access-Control-Allow-Headers','Content-Type')
})

// router.post('/jodconverter/PDF/convertFromUrl', function(req, res) {
//   res.set(cors)
//   res.json(req)
// })
// 

// app.use('/jodconverter', proxy('192.168.2.231:8086'));
app.use(
  '/jodconverter',
  proxy({ 
  	target: 'http://192.168.2.231:8086',
  	changeOrigin: true,
  	logLevel: 'debug',
  	router: {
    // when request.headers.host == 'dev.localhost:3000',
    // override target 'http://www.example.org' to 'http://localhost:8000'
      '192.168.2.231:8086': '127.0.0.1:8080'
  	}
  })
);



const port = process.env.PORT || 8080

module.exports = app.listen(port, ()=>{
	console.log(`Server listening on http://localhost:${port}, Ctrl+C to stop`)
}) 