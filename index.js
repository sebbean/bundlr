var mongoose = require('mongoose')

var base_folder = '../../public/uploads'

exports._models = function() {
	require('./models/media')	
	require('./models/bundle')	
}
exports._route = function (app, auth)  {
	var bundlr = require('./controllers/bundlr')
		, Media = mongoose.model('Media')
		
  app.get('/media/:m_id/json', bundlr.viewJSON)  
  app.post('/media/:m_id', bundlr.media.update)
  app.post('/media/:m_id/page/:p_id', bundlr.updatePage)
  app.get('/media/:m_id/delete/:size_key', bundlr.destroyRender)
  app.get('/media/:m_id/:width/:height', bundlr.view)
  app.get('/media/:m_id/:size_key?', bundlr.view)	

  app.param('m_id', function(req, res, next, id) {
    Media
      .findOne({_id:id})
      .exec(function(err, media) {
            // console.log('meida ', media)

        req.media = media
        next()
      })
  })
}

exports.upload = function(req, res, next) {
	var bundlr = require('./controllers/bundlr')
	return bundlr.upload(req,res,next)
}

