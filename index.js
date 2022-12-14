var express = require('express')
var app = express()
const ytdl = require('ytdl-core')
var MapCache = require('map-cache')
var cache = new MapCache()

const { base58_to_binary } = require('base58-js')
const { binary_to_base58 } = require('base58-js')
const { json } = require('express/lib/response')

//http://192.168.0.26:3555/conv?link=25K6n8x9BaUPmVGG6XSfSSKkucNvCYhoiZENFgt  // Ejemplo

const PORT = 3555

app.get('/conv',function(req,res){

    //---Parameter link
    let link = new TextDecoder().decode(base58_to_binary(req.query.link))
    let origLink = req.query.link
    //---get header range
    let range = req.headers.range
    console.log("Header_range:"+range)

    if(!cache.has(origLink)){
        streamLink(link,origLink,res,range)
    }else{
        res.end(cache.get(origLink))
        cache.del(origLink)
        console.log("Sending from from cache")
    }
    

})

var server = app.listen(PORT,function(){ })

function streamLink(link,origLink,res,range){

    let myPromise = ytdl.getInfo(link)

    myPromise.then(
        function(info){
            let audioFormats = ytdl.filterFormats(info.formats,'audioonly')
            let minAudioTag = 'NA'
            let minBitRate = 10000000
            let minFormat = 'NA'
            //-- Select smallest
            audioFormats.forEach((audio)=>{
                if(audio.bitrate<minBitRate){
                    minAudioTag = audio.itag
                    minBitRate = audio.bitrate
                    minFormat = audio
                } 
            })
            if(minAudioTag!='NA'){
                console.log("--MinBitrate:"+minBitRate + "Minitag:"+minAudioTag)
                let total = minFormat.contentLength
                let newLink = minFormat.url
                let linkBase58 = binary_to_base58(new TextEncoder().encode(newLink))
                console.log(linkBase58)
                cache.set(origLink,linkBase58)
                res.end(linkBase58)



            }else res.end("No bitrate")
        },
        function(onrejected){
            console.log("Error:"+onrejected)
            res.end("error")
        })
}

//----https://ourcodeworld.com/articles/read/713/converting-bytes-to-human-readable-values-kb-mb-gb-tb-pb-eb-zb-yb-with-javascript
function readableBytes(bytes) {
    var i = Math.floor(Math.log(bytes) / Math.log(1024)),
    sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    if(bytes==0) return "0B"
    return (bytes / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + sizes[i];
}