var mongoose = require('mongoose')
	,	Media = mongoose.model('Media')
	, _ = require('underscore')
  , async = require('async')
  , fs = require('fs')
  , path = require('path')
  , ffmpeg = require('fluent-ffmpeg')
  , gm = require('gm')
  , gs = require('ghostscript')
  
exports.uploadFileToFolder = function(files, basefolder, media, cb) {
  async.mapSeries(files, function(file, done) {
      console.log('_ dir name ', __dirname)
      console.log('files ', file, ' mime ', file.mime)

    // get the temporary location of the file
    var tmp_path = file.path;
    var bundle_path = './public/uploads/'

    if(basefolder)
	    bundle_path += basefolder+'/'

    if(!fs.existsSync(bundle_path))
      fs.mkdirSync(bundle_path)

    // set where the file should actually exists - in this case it is in the "images" directory
    var target_path = bundle_path + file.name
    // move the file from the temporary location to the intended location
    fs.rename(tmp_path, target_path, function(err) {
      if (err) throw err;

      // console.log('file.mime ', file.mime, ' index ',file.mime.indexOf('pdf'))
      
      // var mime = new String(file.mime)
      file.bundleKey = basefolder
      file.path = target_path //path.normalize(__dirname + '../../../' + target_path)
      file.url = target_path.slice('./public'.length)
      // file.mime = mime
      var type = file.mime.slice(0,file.mime.indexOf('/'))  

      console.log('file.type ', file.type, ' file.mime ', file.mime)

      var sync = true

      switch(type) {
        case 'image':
          file.imageUrl = file.url
          break
        case 'application':
          if(file.mime.indexOf('pdf') >= 0) {
            sync = false
            if(media && media.pages) {
              media.pages.forEach(function(page, ix) {
                if(fs.existsSync(page.path)) {
                  fs.unlinkSync(page.path)
                  console.log('unlinked page ', page)
                }
              })
              // media.pages = []
            }
            var basename = path.basename(file.path, '.pdf')
            gs()
              .batch()
              // .quiet()
              .nopause()
              .device('pngalpha')
              .input(file.path)
              .output(bundle_path + basename + '-%0d.png')
              .r(150)
              .exec(function(err, stdout, stderr) {
                console.log(' done !', stdout)
                var lines = stdout.split('\n')
                lines.pop()
                var last = lines.pop()
                var count  = last.slice('Page '.length)
                count = parseInt(count)
                console.log('count ', count)

                file.pages = []

                for (var i = 1; i <= count; i++) {
                  var page = {}
                  page.path = bundle_path + basename + '-' + i + '.png'

                  page.url = page.path.slice('./public'.length)

                  page.path = path.normalize(__dirname + '../../../' + page.path)
                  page.page = i

                  if(media && media.pages && media.pages.length >= i && media.pages[i-1])
                    page.name = media.pages[i-1].name

                  file.pages.push(page)
                }
                finish(file)
              })
          }
          break
      }

      if(sync) {
        finish(file)
      }

      function finish(file){
        if(media)
          media.updateFileInfo(file)
        else
          media = Media.withFileInfo(file)
        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
        fs.unlink(tmp_path, function() {
            if (err) throw err;
        });
        media.save(done)        
      }
    });
  }, 
  cb)
}

exports.upload = function(req, res, next) {
    // var files = req.files//req.files && req.files.pop()

    // if(files.image)
    //  file = files.image
    // if(files.images)
    //  files = files.images

  if(req.files && req.files.media && Array.isArray(req.files.media)) {
      
    var bundle_key = null
    
    if(req.bundle) {
      bundle_key = req.bundle.title

      // req.files.media.forEach(function (file, ix) {
      //   var matches = req.bundle.media.filter(function (b) {
      //     return b.name == file.name
      //   })
      //   if(matches && matches.length) {
      //     var match = matches.pop()
      //     match.remove()
      //   }
      // })
    }
    var media = null
    if(req.media) {
      media = req.media
      
      media.sizes.forEach(function(size, ix) {
        if(fs.existsSync(size.path)) {
          fs.unlinkSync(size.path)
          console.log('unlinked ', size.path)
        }
      }) 
      media.sizes = []     
      console.log('media to be updated !', media)
    }

    exports.uploadFileToFolder(req.files.media, bundle_key, media, function(err, medias) {
      // console.log('req.files ', req.files)   
      console.log('medias ', medias)   
      req.medias = medias
      next()
    })
  }
  else
    next()
}

exports.view = function(req, res, next) {
  var media = req.media
  	,	size_key = null
    , preset = null
  // var resizes_folder = path.dirname(media.path) + '/_resizes/'

    // var root_project = __dirname + 
  var resizes_folder = __dirname + '/../../../' + path.dirname(media.path) + '/_resizes/'
  resizes_folder = path.normalize(resizes_folder)
  console.log('resize ', resizes_folder)


  if(req.params.size_key && req.params.size_key.indexOf('x')>=0)
  	size_key = req.params.size_key 
	else if(req.params.width || req.params.height)
		size_key = req.params.width + 'x' + req.params.height
  else if(typeof req.params.size_key != 'undefined') {
    size_key = req.params.size_key
    preset = req.params.size_key
  }
  else {
    switch (media.type) {
      case 'video2':

        // if(media.metaVideoPath && fs.existsSync(media.metaVideoPath))

        var meta_path = media.metaVideoPath || path.dirname(media.path) +'/meta_'+media.name
        console.log('meta path ', meta_path)
        if(fs.existsSync(meta_path)) {
          if(!media.metaVideoPath) {
            media.metaVideoPath = meta_path
            media.save(function(err, media) {
              if(err) console.log(' err ', err)
            })
          }
          return res.sendfile(meta_path)
        }
        //   fs.unlinkSync(meta_path)
        // var lockPoints = media.lockPoints.split(',')
// for(var i=0; i<myArray.length; i++) { myArray[i] = parseInt(myArray[i], 10); } 
        var data = {}
        // if(media.lockPoints)
          data.scaleFill = media.scaleFill
        if(media.lockPoints)
          data.lockPoints = media.lockPoints.split(',')

        var proc2 = new ffmpeg({source: media.path})
        .addOption('-c:v', 'copy')
        .addOption('-metadata', 'comment='+JSON.stringify(data))
        .onCodecData(function(codecinfo) {
          console.log(codecinfo);
        })        
        .saveToFile(meta_path, function(stdout, stderr) {
          media.metaVideoPath = meta_path
          console.log('done sending ', stdout)
          media.save(function(err, media){
            res.sendfile(meta_path)  
          })
        })

        return
      default:
        return res.sendfile(media.path)      
    }    
  }

  var output_folder = resizes_folder + size_key
    , output_path = output_folder + '/' + media.name

  // var saveAndRedirect = function(req, res, media, output_path) {
    
  //   req.bundle.save(function(err, bundle) {
  //     console.log('saved ', err)
  //     res.redirect(url)            
  //   })            
  // }

  if(!fs.existsSync(resizes_folder))
    fs.mkdirSync(resizes_folder)

  if(!fs.existsSync(output_folder))
    fs.mkdirSync(output_folder)

  var url_base = '/uploads'
  
  if(media.bundleKey)
	  url_base += '/'+media.bundleKey

	url_base += '/_resizes/'+size_key+'/'

  var url = url_base+media.name  

  var image_render = {size: size_key, url: url, path: output_path}

  if(fs.existsSync(output_path))  {
    console.log("IM HERE")
    var matches = media.sizes.filter(function(s){
      return s.size == size_key
    })
    if(matches.length == 0) {

      media.sizes.addToSet(image_render)
      media.imageUrl = url_base + media.name + '.jpg'
      media.save(function(err, media) {
		    // res.sendfile(output_path)
      })
    }
    // else

            res.sendfile(output_path)

  }
  else
  switch(media.type) {
    case 'video':
      var videoEncode = {
          format: 'mov'
        , codec: 'h264'
        , bitrate: '26000k'
        , keyframe: 1
        , sizeKey: size_key
      }
      
      console.log('Video Encode ', videoEncode)

      var proc2 = new ffmpeg({source: media.path})       
      .onCodecData(function(codecinfo) {
        console.log(codecinfo);
      })
      .onProgress(function(progress) {
        console.log(progress);
      })

      if(preset) {
      // .withAspect('4:3')      
      // .withSize(size_key)
      // .applyAutopadding(true, 'white')          
        proc2
 
        .usingPreset(preset)
      }
      else {
        videoEncode.width = widthFromSizeKey(size_key)
        videoEncode.height = heightFromSizeKey(size_key)        

        if(videoEncode.height)
          videoEncode.bitrate = videoEncode.height + '0k'

        proc2
        .toFormat(videoEncode.format)
        .withVideoCodec(videoEncode.codec)               
        .withVideoBitrate(videoEncode.bitrate)
        .addOption('-g',videoEncode.keyframe)
      }

      proc2
      .saveToFile(output_path, function(stdout, stderr) {

        var info = fs.statSync(output_path)
        videoEncode.filesize = info.size

        image_render.videoEncode = videoEncode

        if(!preset) {
          var proc1 = new ffmpeg({source: media.path})
          .withSize(size_key)
          .takeScreenshots({
              count: 1
            , timemarks: ['0']
            , filename: media.name
          }, output_folder, function(err, filenames) {

            var image_file = filenames.pop()
            media.imageUrl = url_base + image_file

            media.sizes.addToSet(image_render)
            media.save(function(err, media) {
              res.sendfile(output_path)
  	        })
          })       
        }
        else {
            media.sizes.addToSet(image_render)
            media.save(function(err, media) {
              res.sendfile(output_path)
            })          
        }
      })
      break

    case 'image':
    	var width = size_key.split('x')[0]
    		,	height = size_key.split('x')[1]
      gm(media.path)
        .resize(size_key)
        .setFormat('png')
        .write(output_path,function(err) {
          if(err) console.log('err ', err)
          // console.log('stream ', stdout)
          // stdout.pipe(res)
          // stderr.pipe(res)
          // res.io.of('/bundle_'+req.bundle.id).emit('size',{width: req.params.width, height: req.params.height})
          media.sizes.addToSet(image_render)          
          media.save(function(err, media) {
            res.sendfile(output_path)
          })
        })
      break
  }
}

exports.viewJSON = function(req, res) {
  res.json(req.media)
}

function widthFromSizeKey(size_key) {
  // var parts = size_key.split('x')
  var width = size_key.substring(0,size_key.indexOf('x'))
  return width
}
function heightFromSizeKey(size_key) {
  // var parts = size_key.split('x')
  var height = size_key.substring(size_key.indexOf('x')+1)
  return height
}
// exports.media = {}
exports.destroy = function(req, res) {
  if(fs.existsSync(req.media.path))
    fs.unlinkSync(req.media.path)
  req.media.remove(function(err) {
    req.bundle.save(function(err, budle) {
      res.redirect('/bundles/'+req.bundle.id)       
    })
  })
}

exports.updatePage = function(req, res) {
  var media = req.media
    , page = media.pages.id(req.params.p_id)

  if(!page) return res.send('no page with id ', req.params.p_id)

  _.extend(page, req.body)
  media.save(function(err, media) {
    if(err) console.log('error saving media ', err)
    res.json(media)
  })
}

exports.destroyRender= function(req, res) {
  var media = req.media
    , size_key = req.params.size_key
    , size = media.fileWithSize(size_key)

  console.log('log ', size)

  // if(!size)
  	// return res.send('effed')

  if(fs.existsSync(size.path))
    fs.unlinkSync(size.path)
  
  media.sizes.remove(size)

  media.save(function(err, media) {
    res.redirect(req.header('Referer'))       
  })
}

exports.media = {}
exports.media.update = function (req, res) {
  var media = req.media

  console.log('body ', req.body)

  if(req.body.lockPoints &&
    req.body.lockPoints != media.lockPoints)
    media.removeMetaVideoFile()

  _.extend(media, req.body)

  if(typeof req.body.spinVideo != 'undefined') {
    media.spinVideo = req.body.spinVideo == 'true'
  }
  if(typeof req.body.scaleFill != 'undefined') {
    media.scaleFill = req.body.scaleFill == 'true'
    media.removeMetaVideoFile()    
  }

  if(req.files.media) {
    exports.uploadFileToFolder([req.files.media], media.bundleKey, media, function(err, medias) {
      res.json(medias)   
    })
  }
}
