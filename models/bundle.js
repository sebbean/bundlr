// Bundle schema


var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , MediaSchema = require('./media').Schema
  , _ = require('underscore')
  , async = require('async')
  , gm = require('gm')
  , fs = require('fs')
  , path = require('path')
  , ffmpeg = require('fluent-ffmpeg')

// var MediaSchema = new Schema({
//     path: String
//   , name: String
//   , url: String
//   , imageUrl: String
//   , filename: String
//   , mediaKey: String
//   , size: Number
//   , type: String
//   , lastModifiedDate: Date  
//   , sizeKeys: [{
//       size: String
//     , url: String
//     , path: String
//     , imageUrl: String
//     , imagePath: String    
//   }]
// })

// MediaSchema.statics.withFileInfo = function(file) {
//   var schema = this
//   var image = new schema(file)

//   // _.extend(file, image)
//   image.mediaKey = image.name

//   return image
// }

// MediaSchema.methods.fileWithSizeKey = function(size_key) {
//   var media = this
//   console.log('size ky ', size_key)
//   var matches =
//   media.sizeKeys.filter(function(render) {
//     return render.size == size_key
//   })

//   if(matches.length)
//     return matches.pop()

//   return null
// }

// mongoose.model('Media', MediaSchema)


var getTags = function (tags) {
  return tags.join(',')
}

var setTags = function (tags) {
  return tags.split(',')
}


var BundleSchema = new Schema({
    title: {type : String, default : '', trim : true}
  , body: {type : String, default : '', trim : true}    
  , user: {type : Schema.ObjectId, ref : 'User'}
  , comments: [{type : Schema.ObjectId, ref : 'Comment'}]
  , tags: {type: [], get: getTags, set: setTags}
  , media: [{type: Schema.ObjectId, ref: 'Media'}]
  , categories: []
  , createdAt  : {type : Date, default : Date.now}    
})

BundleSchema.path('title').validate(function (title) {
  return title.length > 0
}, 'Article title cannot be blank')


BundleSchema.statics.bundleWithTitle = function(title, cb) {
  var Bundle = this

  Bundle
    .findOne({title:title})
    .populate('media')
    .exec(cb)
}
// BundleSchema.path('body').validate(function (body) {
//   return body.length > 0
// }, 'Article body cannot be blank')



mongoose.model('Bundle', BundleSchema)