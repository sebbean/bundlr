
var mongoose = require('mongoose')
  , Bundle = mongoose.model('Bundle')
  , Media = mongoose.model('Media')
  , _ = require('underscore')
  , async = require('async')
  , gm = require('gm')
  , fs = require('fs')
  , path = require('path')
  , ffmpeg = require('fluent-ffmpeg')

// New bundle
exports.new = function(req, res){
  res.render('bundles/new', {
      title: 'New bundle'
    , bundle: new Bundle({})
  })
}


// Create an bundle
exports.create = function (req, res) {
  var bundle = new Bundle(req.body)

  bundle.user = req.user

  // exports.uploadImageRequest(req, bundle, function(err, bundle) {
  //   if(err) return res.render('400')
    bundle.save(function(err){
      if (err) {
        res.render('bundles/new', {
            title: 'New bundle'
          , bundle: bundle
          , errors: err.errors
        })
      }
      else {
        res.redirect('/bundles/'+bundle._id)
      }
    })    
  // })
}


exports.upload = function(req, res) {
  var bundle = req.bundle
    , medias = req.medias

  if(medias)
  medias.forEach(function(media, ix) {
    bundle.media.push(media)
  })


    bundle.save(function(err, bundle) {
      res.json(bundle)
    })
  // })
}

// Edit an bundle
exports.edit = function (req, res) {
  res.render('bundles/edit', {
    title: 'Edit '+req.bundle.title,
    bundle: req.bundle
  })
}


// Update bundle
exports.update = function(req, res){
  var bundle = req.bundle
    , medias = req.medias


  _.extend(bundle, req.body)

  if(medias)
    bundle.media.addToSet(medias)

  // exports.uploadImageRequest(req, bundle, function(err, bundle) {
    // if(err) return res.render('400')
    bundle.save(function(err, doc) {
      if (err) {
        res.render('bundles/edit', {
            title: 'Edit bundle'
          , bundle: bundle
          , errors: err.errors
        })
      }
      else {
        res.redirect('/bundles/'+bundle._id)
      }
    }) 
  // })
}

// View an bundle
exports.show = function(req, res){
  var bundle = req.bundle
  
  bundle.media.sort(function(a, b) {
    if(a.type == b.type)
      return b.name - a.name
    return b.type - a.type
  })  
  
  res.render('bundles/show', {
    title: req.bundle.title,
    bundle: bundle,
    comments: req.comments
  })
}

// View an bundle
exports.showJSON = function(req, res){
  res.json(['bundles/show', {
    title: req.bundle.title,
    bundle: req.bundle,
    comments: req.comments
  }])
}


// Delete an bundle
exports.destroy = function(req, res){
  var bundle = req.bundle

  bundle.remove(function(err){
    // req.flash('notice', 'Deleted successfully')
    res.redirect('/bundles')
  })
}


// Listing of bundles
exports.index = function(req, res){
  var perPage = 25
    , page = req.param('page') > 0 ? req.param('page') : 0

  Bundle
    .find({})
    .populate('user', 'name')
    .sort({'title': 1}) // sort by date
    .limit(perPage)
    .skip(perPage * page)
    .exec(function(err, bundles) {
      if (err) return res.render('500')
      Bundle.count().exec(function (err, count) {
        res.render('bundles/index', {
            title: 'List of bundles'
          , bundles: bundles
          , page: page
          , pages: count / perPage
        })
      })
    })
}

exports.media = {}
exports.media.destroy = function(req, res) {

  req.media.remove(function(err) {
    req.bundle.save(function(err, budle) {
      res.redirect('/bundles/'+req.bundle.id)       
    })
  })
}
exports.media.destroyRender= function(req, res) {
  var bundle = req.bundle
    , media = req.media
    , size = req.size

  if(fs.existsSync(size.path))
    fs.unlinkSync(size.path)
  
  media.sizeKeys.remove(size)

  bundle.save(function(err, budle) {
    res.redirect('/bundles/'+req.bundle.id)       
  })
}
