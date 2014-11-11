require 'rubygems'
require 'mechanize'
require 'cgi'
require 'open-uri'
require 'json'
require 'sinatra'
require 'pyro'

set :server, 'webrick'
enable :sessions

FB_LOGIN_URL = 'https://www.facebook.com/dialog/oauth?client_id=464891386855067&redirect_uri=https://www.facebook.com/connect/login_success.html&scope=basic_info,email,public_profile,user_about_me,user_activities,user_birthday,user_education_history,user_friends,user_interests,user_likes,user_location,user_photos,user_relationship_details&response_type=token'

before '/api/*' do
  authenticateAndSetup
end

get '/' do
  if session[:tinder_token]
    session[:tinder_token]
  else
    'you need to <a href="/login">login</a>.'
  end
  # erb :index
end

get '/login' do
  begin
    a = Mechanize.new
    a.get(FB_LOGIN_URL) do |page|

      # Submit the login form
      redir_page = page.form_with(:action => /login.php/) do |f|
        f.email  = params[:username]
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
          if form
            btn = form.button_with(:id => 'checkpointSubmitButton')
            redir_page = a.submit(form, btn)
          end

          form = redir_page.form_with(:class => /checkpoint/)
          if form
            btn = form.button_with(:id => 'checkpointSubmitButton')
            redir_page = a.submit(form, btn)
          end
        end
      end

      token = CGI::parse(redir_page.uri.fragment)['access_token'].first
      content = open('https://graph.facebook.com/me?access_token=' + token).read
      fb_id = JSON.parse(content)['id']

      pyro = TinderPyro::Client.new
      pyro.sign_in(fb_id, token)

      session[:fb_token] = token
      session[:fb_id] = fb_id
      session[:tinder_token] = pyro.auth_token
    end
    'logged in'
    # redirect to('/')
  rescue OpenURI::HTTPError => ex
    puts ex
    'failed'
  end
end

get '/logout' do
  session[:tinder_token] = nil
  redirect to('/')
end

# API requests

get '/api/people' do
  users = @pyro.get_nearby_users
  users.to_json
end

get '/api/like/:id' do
  result = @pyro.like(params[:id])
  puts result
  {result: 'ok'}.merge(result).to_json
end

private

def authenticateAndSetup
  redirect to('/') if !session[:tinder_token]

  @pyro = TinderPyro::Client.new
  @pyro.auth_token = session[:tinder_token]

  content_type :json
end