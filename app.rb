require 'rubygems'
require 'mechanize'
require 'cgi'
require 'open-uri'
require 'json'
require 'sinatra'
require 'sinatra/cookies'
require 'pyro'

# set :server, 'webrick'
enable :sessions
set :session_secret, '71384ef55b7b79cb7a8cfcc7921ffd5fd525c850d8648a10ba61250162cfc4fb14e22081c77499b31c2eca84cf7d922974bf1ad5dd91a487de461a6d2aa18744'

FB_LOGIN_URL = 'https://www.facebook.com/dialog/oauth?client_id=464891386855067&redirect_uri=https://www.facebook.com/connect/login_success.html&scope=basic_info,email,public_profile,user_about_me,user_activities,user_birthday,user_education_history,user_friends,user_interests,user_likes,user_location,user_photos,user_relationship_details&response_type=token'

before '/api/*' do
  authenticateAndSetup
end

get '/' do
  # if session[:tinder_token]
  #   session[:tinder_token]
  # else
  #   'you need to <a href="/login">login</a>.'
  # end
  erb :index
end

post '/login' do
  begin
    result = {}
    a = Mechanize.new
    a.get(FB_LOGIN_URL) do |page|

      # Submit the login form
      redir_page = page.form_with(:action => /login.php/) do |f|
        f.email  = params[:email]
        f.pass   = params[:password]
      end.click_button

      # this is for the weird case of when facebook finds a "suspicious" login
      form = redir_page.form_with(:class => /checkpoint/)
      if form
        btn = form.button_with(:id => 'checkpointSubmitButton')
        redir_page = a.submit(form, btn)

        form = redir_page.form_with(:class => /checkpoint/)
        if form
          btn = form.button_with(:value => 'This is Okay')
          redir_page = a.submit(form, btn)

          form = redir_page.form_with(:class => /checkpoint/)
          while form do
            btn = form.button_with(:id => 'checkpointSubmitButton')
            redir_page = a.submit(form, btn)
            form = redir_page.form_with(:class => /checkpoint/)
          end
        end
      end

      token = CGI::parse(redir_page.uri.fragment)['access_token'].first
      content = open('https://graph.facebook.com/me?access_token=' + token).read
      fb_id = JSON.parse(content)['id']

      @pyro = TinderPyro::Client.new
      result = @pyro.sign_in(fb_id, token)

      session[:fb_token] = token
      session[:fb_id] = fb_id
      session[:tinder_token] = @pyro.auth_token
      response.set_cookie('logged_in', {:value => true})
      response.set_cookie('name', {:value => result['user']['full_name']})
      response.set_cookie('smallPhoto', {:value => result['user']['photos'][0]['processedFiles'][3]['url']})
    end
    # {result: 'ok'}.merge(result).to_json
      redirect to('/')
  rescue OpenURI::HTTPError => ex
    puts ex
    ex.to_json
  end
end

get '/logout' do
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
end