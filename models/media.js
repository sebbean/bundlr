// Bundle schema

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , _ = require('underscore')
  , async = require('async')
  , fs = require('fs')
  // , path = require('path')
  // , ffmpeg = require('fluent-ffmpeg')
  // , gm = require('gm')


var MediaSchema = new Schema({
    path: String
  , bundleKey: String
  , name: String
  , url: String
  , imageUrl: String
  , filename: String
  , mediaKey: String
  , size: Number
  , type: String
  , mime: String
  , lastModifiedDate: Date  
  , spinVideo: Boolean
  , scaleFill: { type: Boolean, default: false}
  , lockPoints: String
  , metaVideoPath: String
  , sizes: [{
      size: String
    , url: String
    , path: String
    , imageUrl: String
    , imagePath: String    
    , videoEncode: { type:Schema.Types.Mixed, default: null}
    // {
    //     format: String
    //   , codec: String
    //   , bitrate: String
    //   , keyframe: Number
    //   , sizeKey: String
    //   , width: Number
    //   , height: Number
    // }
  }]
  , pages: [{
      url: String
    , path: String    
    , page: Number
    , name: String
  }]
  , dateModified: { type: Date, default: Date.now}
})

MediaSchema.pre('remove', function(next) {
  var media = this

  async.map(media.sizes, function(size, done) {
    fs.unlink(size.path, function(err) {
      if(size.imagePath && size.imagePath != size.path)
        fs.unlink(size.imagePath, function(err) {
          done(null, size)
        })
      else
        done(null, size)
    }) 
  }, function(err, results) {

    async.map(media.pages, function(page, done){
      fs.unlink(page.path, function(err) {
        done(null, page)
      })
    }, function(err, results) {
      fs.unlink(media.path, function(err) {
        if(err) console.log(' file error ', err)
        next()      
      })
    })
  }) 
})

MediaSchema.pre('save', function (next) {
  this.dateModified = new Date


  next()
})

MediaSchema.statics.withFileInfo = function(file) {
  var schema = this
  var image = new schema(file)

  // _.extend(file, image)
  image.mediaKey = image.name
  
  if(file.mime.indexOf('pdf') >= 0) 
    image.type = 'pdf'  
  else
    image.type = file.mime.slice(0,file.mime.indexOf('/'))      

  return image
}

MediaSchema.methods.fileWithSize = function(size_key) {
  var media = this
  // console.log('size ky ', size_key)

    var matches = media.sizes.filter(function(render) {
    return render.size == size_key
  })

  if(matches.length)
    return matches.pop()


  return null
}

MediaSchema.methods.urlForSize = function(size_key) {
	var media = this
		,	file = media.fileWithSize(size_key)

	// console.log('file ', file)
	// if(file)
	// 	return file.url

  if(!size_key || typeof size_key == 'undefined')
    return '/media/'+media.id

 	return '/media/' + media.id + '/' + size_key	
	return null
}

MediaSchema.methods.removeMetaVideoFile = function(){
  if(this.type == 'video') {
    if(this.metaVideoPath && fs.existsSync(this.metaVideoPath)) {
      fs.unlinkSync(this.metaVideoPath)
    
      this.metaVideoPath = null
      // this.save()
      console.log('unlinked meta video path');
    }
  }
}

exports.Schema = MediaSchema
mongoose.model('Media', MediaSchema)