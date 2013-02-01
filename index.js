

var bundlr = require('./controllers/bundlr')


module.exports = function (app)  {
	require('./models/bundle')
	require('./models/media')	

  app.get('/media/:m_id/json', bundlr.viewJSON)  
  app.post('/media/:m_id', bundlr.media.update)
  app.post('/media/:m_id/page/:p_id', bundlr.updatePage)
  app.get('/media/:m_id/delete/:size_key', bundlr.destroyRender)
  app.get('/media/:m_id/:width/:height', bundlr.view)
  app.get('/media/:m_id/:size_key?', bundlr.view)	
}