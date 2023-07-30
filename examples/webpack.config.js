const fs = require('fs')
const path = require('path')
const webpack = require('webpack')

module.exports = {
	mode:'development',
	/**
	 *  example创建多个子目录
	 *  把不同的demo放到不同的子目录中
	 *  每个子目录下会创建一个app.js
	 */

	entry: fs.readdirSync(__dirname).reduce((entries, dir) => {
	    const fullDir = path.join(__dirname, dir)
	    const entry = path.join(fullDir, 'app.js')
	    if (fs.statSync(fullDir).isDirectory() && fs.existsSync(entry)) {
	      entries[dir] = ['webpack-hot-middleware/client', entry]
	    }
    	return entries
    }, {}),

	/**
	 *  根据不同的目录名称，生成目标js,名称和目录名一致
	 */
	output:{
		path: path.join(__dirname, '__build__'),
		filename: '[name].js',
		publicPath: '/__build__/'
	},
	module: {
		rules: [
			{
				 test: /\.js$/,
				 exclude: /node-modules/,
				 loader: 'babel-loader'
			},
			{
				 test: /\.css$/,
				 use:[
				 		'style-loader','css-loader'
				 ]
			},
      {
        test: /\.(png|jpg|jpeg|gif|webp|ico)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              esModule: false
            }
          }
        ]
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        use: [{
          loader: 'file-loader',
          options: {
              name: "[name].[ext]",
              outputPath: "font/"
            }
        }]
      }
		]
	},
	resolve:{
		extensions:['.js']
	},
	plugins: [
	    new webpack.HotModuleReplacementPlugin(),
	    new webpack.NoEmitOnErrorsPlugin()
  	],
  	externals: {
 	  jquery: "jQuery",
	}
}
