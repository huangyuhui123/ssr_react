const axios = require('axios')
const webpack = require('webpack')
const path = require('path')
const serverConfig = require("../../build/webpack.config.server")
const MemoryFs = require("memory-fs")
const ReactDomServer = require("react-dom/server")
const proxy = require('http-proxy-middleware')

const getTemplate = ()=>{
    return new Promise((resolve,reject)=>{
        axios.get("http://localhost:8888/public/index.html")
        .then(res=>{
            resolve(res.data)
        }).catch(reject)
    })
}

const Module = module.constructor
let serverBundle
const mfs = new MemoryFs   //从内存中读取打包后的文件, 因为在硬盘中读文件比较慢
const serverCompiler = webpack(serverConfig)
serverCompiler.outputFileSystem = mfs
serverCompiler.watch({},(err,stats)=>{
    if(err) throw err
    stats = stats.toJson()
    stats.errors.forEach(err=>console.error(err))
    stats.warnings.forEach(warn=>console.warn(warn))

    const bundlePath = path.join(
        serverConfig.output.path,
        serverConfig.output.filename
    )
    const bundle = mfs.readFileSync(bundlePath,'utf-8')
    //把String 转化为模块
    const m = new Module()
    m._compile(bundle,'server-entry.js')
    serverBundle = m.exports.default


})

module.exports= function(app){
    app.use('/public',proxy(
        {target:'http://localhost:8888'}
    ))
    app.get('*',function(req,res){
        getTemplate().then(template=>{
            const content = ReactDomServer.renderToString(serverBundle)
            res.send(template.replace('<!--app-->',content))
        })
    })
}