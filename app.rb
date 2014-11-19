require 'rubygems'
require 'cgi'
require 'open-uri'
require 'json'
require 'sinatra'
require 'sinatra/cookies'
require 'pyro'

set :server, 'puma'
enable :sessions
set :session_secret, '71384ef55b7b79cb7a8cfcc7921ffd5fd525c850d8648a10ba61250162cfc4fb14e22081c77499b31c2eca84cf7d922974bf1ad5dd91a487de461a6d2aa18744'

before '/api/*' do
  authenticateAndSetup
end

get '/' do
  erb :index
end

post '/login' do
  response['Access-Control-Allow-Origin'] = '*'
  @pyro = TinderPyro::Client.new
  result = @pyro.sign_in(params[:fb_id], params[:fb_token])

  session[:fb_token] = params[:fb_token]
  session[:fb_id] = params[:fb_id]
  session[:tinder_token] = @pyro.auth_token
  response.set_cookie('logged_in', {:value => true})
  response.set_cookie('name', {:value => result['user']['full_name']})
  response.set_cookie('smallPhoto', {:value => result['user']['photos'][0]['processedFiles'][3]['url']})
  {result: 'ok'}.merge(result).to_json
end

get '/logout' do
  response['Access-Control-Allow-Origin'] = '*'
  session.clear
  cookies.map{|cookie| response.delete_cookie(cookie[0]) }
  redirect to('/')
end

# API requests

get '/api/people' do
  users = @pyro.get_nearby_users
  users.to_json
end

get '/api/user/:id' do
  result = @pyro.info_for_user(params[:id])
  result.to_json
end

get '/api/like/:id' do
  result = @pyro.like(params[:id])
  {result: 'ok'}.merge(result).to_json
end

get '/api/pass/:id' do
  result = @pyro.dislike(params[:id])
  {result: 'ok'}.merge(result).to_json
end

get '/api/location/:lat/:lng' do
  result = @pyro.update_location(params[:lat], params[:lng])
  {result: 'ok'}.merge(result).to_json
end

post '/api/message/:id' do
  result = @pyro.send_message(params[:id], params[:msg])
  {result: 'ok'}.merge(result).to_json
end

private

def authenticateAndSetup
  redirect to('/') if !session[:tinder_token]

  @pyro = TinderPyro::Client.new
  @pyro.auth_token = session[:tinder_token]

  content_type :json
  # TODO: change me to whatever node-webkit is providing
  response['Access-Control-Allow-Origin'] = '*'
end