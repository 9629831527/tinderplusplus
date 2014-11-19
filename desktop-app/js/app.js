var app = angular.module('tinder++', ['ngAutocomplete', 'ngCookies']);

app.factory('API', function GitHub($http, $cookies) {
  $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
  $http.defaults.withCredentials = true;
  var host = 'https://tinderplus.herokuapp.com/';
  //var host = '/';
  return {
    login: function(id, token) {
      $http.post(host + 'login', $.param({fb_id: id, fb_token: token}))
          .success(function(data) {
            console.log(data);
            $cookies.logged_in = 'true';
            $cookies.name = data.user.full_name;
            $cookies.smallPhoto = data.user.photos[0].processedFiles[3].url;
            window.location.reload();
          })
          .error(function(data) {
            console.log(data);
          });
    },
    updateLocation: function(lat, lng) {
      $http.get(host + 'api/location/' + lat + '/' + lng)
          .success(function(data, status, headers, config) {
            console.log(data);
          })
          .error(function(data, status, headers, config) {
            alert(data);
          });
    },
    people: function(callbackFn) {
      $http.get(host + 'api/people')
      //$http.get(host + 'people.json')
          .success(function(data) {
            callbackFn(data.results);
          })
          .error(function(data) {
            console.log(data);
          });
    },
    userInfo: function(userId) {
      $http.get(host + 'api/user/' + userId)
          .success(function(data) {
            console.log(data);
          })
          .error(function(data) {
            console.log(data);
          });
    },
    like: function(userId) {
      $http.get(host + 'api/like/' + userId)
          .success(function(data) {
            console.log(data);
            if (data.match) {
              alert("it's a match!");
            }
          })
          .error(function(data) {
            console.log(data);
          });
    },
    pass: function(userId) {
      $http.get(host + 'api/pass/' + userId)
          .success(function(data) {
            console.log(data);
          })
          .error(function(data) {
            console.log(data);
          });
    },
    message: function(userId, message) {
      $http.post(host + 'api/message/' + userId, $.param({msg: message}))
          .success(function(data) {
            console.log(data);
          })
          .error(function(data) {
            console.log(data);
          });
    }
  };
});

app.controller('TinderController', function TinderController($scope, $http, $timeout, $window, $cookies, API) {
  $scope.allPeople = [];
  $scope.peopleIndex = 0;
  $scope.showLocation = false;

  $scope.autocompleteOptions = {
    types: '(cities)'
  };

  $scope.swapPhoto = function(index) {
    $scope.allPeople[$scope.peopleIndex].photoIndex = index;
  };

  $scope.getCookie = function(cookieName) {
    return $cookies[cookieName];
  };

  $scope.watchAutocomplete = function () { return $scope.details; };
  $scope.$watch($scope.watchAutocomplete, function (details) {
    if (details) {
      $cookies.currentCity = details.name;
      API.updateLocation(details.geometry.location.k, details.geometry.location.B);
      $scope.showLocation = false;
      $('#autocompleteLocation').val('');
    }
  }, true);

  $scope.$on('cardsRendered', function() {
    initCards();
  });

  var getPeople = function() {
    API.people(setPeople);
  };

  var setPeople = function(people) {
    if (people && people.length) {
      $scope.peopleIndex = 0;
      $scope.allPeople = people;
      $.map($scope.allPeople, function(person) { person.photoIndex = 0; });
    }
  };

  var initCards = function() {
    $scope.cards = [].slice.call($('.tinder-card'));
    var $faderEls;

    var config = {
      throwOutConfidence: function (offset, element) {
        return Math.min(Math.abs(offset) / (element.offsetWidth / 3), 1);
      }
    };
    window.stack = gajus.Swing.Stack(config);

    $scope.cards.forEach(function (targetElement) {
      stack.createCard(targetElement);
    });

    stack.on('throwout', function (e) {
      var userId = $scope.allPeople[$scope.peopleIndex]._id;
      // TODO: add to queue instead of liking/passing immediately
      (e.throwDirection < 0) ? API.pass(userId) : API.like(userId);
      $scope.peopleIndex++;
      $scope.$apply();
      $(e.target).fadeOut(500);
      if ($scope.peopleIndex >= $scope.allPeople.length) {
        getPeople();
      }
    });

    stack.on('throwin', function (e) {
      $('.pass-overlay, .like-overlay').css('opacity', 0);
    });

    var fadeDebounce = debounce(function(opacity) {
      if ($faderEls)
        $faderEls.css('opacity', opacity);
    }, 10);

    stack.on('dragmove', function (obj) {
      obj.origEvent.srcEvent.preventDefault();
      if (!$passOverlay || !$likeOverlay) {
        $passOverlay = $(obj.target).children('.pass-overlay');
        $likeOverlay = $(obj.target).children('.like-overlay');
      }
      if (!$faderEls) {
        $faderEls = $('.fader');
      }

      var opacity = (1 - obj.throwOutConfidence).toFixed(2);
      if ($faderEls && (parseFloat($faderEls.first().css('opacity')).toFixed(2) != opacity)) {
        fadeDebounce(opacity);
      }

      if (obj.throwDirection < 0) { // left
        pass(obj.throwOutConfidence);
      } else { // right
        like(obj.throwOutConfidence);
      }
    });

    stack.on('dragend', function(e) {
      $passOverlay = $likeOverlay = null;
      if ($faderEls) {
        $faderEls.fadeTo(600, 1);
        $faderEls = null;
      }
    });

    Mousetrap.bind('left', function () {
      var cardEl = $scope.cards[$scope.cards.length - $scope.peopleIndex - 1];
      var card = stack.getCard(cardEl);
      card.throwOut(-100, -50);
      $passOverlay = $(cardEl).children('.pass-overlay');
      $likeOverlay = $(cardEl).children('.like-overlay');
      pass(1);
    });

    Mousetrap.bind('right', function () {
      var cardEl = $scope.cards[$scope.cards.length - $scope.peopleIndex - 1];
      var card = stack.getCard(cardEl);
      card.throwOut(100, -50);
      $passOverlay = $(cardEl).children('.pass-overlay');
      $likeOverlay = $(cardEl).children('.like-overlay');
      like(1);
    });

    // randomize rotation
    $timeout(function() {
      $.each($scope.cards, function(idx, card) {
        var $card = $(card);
        var marginLeft = parseInt($card.css('margin-left'));
        $card.css('margin-left', '-' + (Math.floor(Math.random()*((marginLeft+10)-(marginLeft-10)+1)+(marginLeft-10))) + 'px')
            .css('transform', 'rotate(' + (Math.floor(Math.random()*(3+3+1)-3)) + 'deg)');
      });
    }, 0, false);
  };

  API.people(setPeople);

});

app.controller('LoginController', function LoginController($scope, $http, $cookieStore, API) {
  $scope.loginUrl = 'https://www.facebook.com/dialog/oauth?client_id=464891386855067&redirect_uri=https://www.facebook.com/connect/login_success.html&scope=basic_info,email,public_profile,user_about_me,user_activities,user_birthday,user_education_history,user_friends,user_interests,user_likes,user_location,user_photos,user_relationship_details&response_type=token';

  $scope.fbAuthData = {};

  $scope.hasValidToken = function() {
    return !!$cookieStore.get('logged_in');
  };

  $scope.startLogin = function() {
    var w = 1060;
    var h = 600;
    var left = (screen.width/2)-(w/2);
    var top = (screen.height/2)-(h/2);
    var options = 'width='+w+', height='+h+', top='+top+', left='+left;
    var loginWindow = window.open($scope.loginUrl, 'Login to Tinder', options);
    var interval = window.setInterval(function() {
      checkForToken(loginWindow, interval);
    }, 500);
  };

  var tinderLogin = function() {
    API.login($scope.fbAuthData['fb_id'], $scope.fbAuthData['access_token']);
  };

  var checkForToken = function(loginWindow, interval) {
    if (loginWindow.closed){
      window.clearInterval(interval);
    } else {
      var url = loginWindow.document.URL;
      var paramString = url.split("#")[1];
      if (!!paramString) {
        var allParam = paramString.split("&");
        for (var i = 0; i < allParam.length; i++) {
          var param = allParam[i].split("=");
          $scope.fbAuthData[param[0]] = param[1];
        }
        loginWindow.close();
        window.clearInterval(interval);
        getFBUserId($scope.fbAuthData['access_token']);
      }
    }
  };

  var getFBUserId = function(token) {
    var graphUrl = 'https://graph.facebook.com/me?access_token=' + token;
    $http.get(graphUrl)
        .success(function(data) {
          console.log(data);
          $scope.fbAuthData['fb_id'] = data.id;
          tinderLogin();
        })
        .error(function(data) {
          console.log(data);
        });
  }
});

app.directive('renderImagesDirective', function() {
  return function(scope, element, attrs) {
    if (scope.$last){
      scope.$emit('cardsRendered');
    }
  };
});

app.filter('bdayToAge', function () {
  return function (bday) {
    return moment.duration(moment().diff(moment(bday))).years();
  };
});

var $passOverlay, $likeOverlay;

function pass(confidence) {
  applyOpacity($passOverlay, $likeOverlay, confidence);
}

function like(confidence) {
  applyOpacity($likeOverlay, $passOverlay, confidence);
}

function applyOpacity(applyEl, clearEl, confidence) {
  applyEl.css('opacity', confidence * (2 / 3));
  clearEl.css('opacity', 0);
}

// helpers

var debounce = function(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};
