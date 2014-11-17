var app = angular.module('tinder++', ['ngAutocomplete']);

app.controller('TinderController', function TinderController($scope, $http, $timeout, $window) {
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
    return docCookies.getItem(cookieName);
  };

  $scope.watchAutocomplete = function () { return $scope.details; };
  $scope.$watch($scope.watchAutocomplete, function (details) {
    if (details) {
      docCookies.setItem('currentCity', details.name);
      API.updateLocation(details.geometry.location.k, details.geometry.location.B);
      $scope.showLocation = false;
      $('#autocompleteLocation').val('');
    }
  }, true);

  $scope.$on('cardsRendered', function() {
    initCards();
  });

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
      $scope.peopleIndex++;
      $scope.$apply();
      $(e.target).fadeOut(500);
      if ($scope.peopleIndex >= $scope.allPeople.length) {
        API.people();
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

  var API = {
    //login: function(username, password) {
    //  $http.post('/login')
    //      .success(function(data) {
    //        //docCookies.setItem('name', data.user.full_name);
    //        //docCookies.setItem('smallPhoto', data.users.photos[0].processedFiles[3].url);
    //        $window.location.reload();
    //      })
    //      .error(function(data) {
    //        alert(data);
    //      });
    //},
    updateLocation: function(lat, lng) {
    $http.get('/api/location/' + lat + '/' + lng)
        .success(function(data, status, headers, config) {
          console.log(data);
        })
        .error(function(data, status, headers, config) {
          alert(data);
        });
    },
    people: function() {
      //$http.get('/api/people')
      $http.get('people.json')
          .success(function(data) {
            $scope.peopleIndex = 0;
            $scope.allPeople = data.results;
            $.map($scope.allPeople, function(person) { person.photoIndex = 0; });
          })
          .error(function(data) {
            console.log(data);
          })
    },
    userInfo: function(userId) {
      $http.get('/api/user/' + userId)
          .success(function(data) {
            console.log(data);
          })
          .error(function(data) {
            console.log(data);
          });
    },
    like: function(userId) {
      $http.get('/api/like/' + userId)
          .success(function(data) {
            console.log(data);
          })
          .error(function(data) {
            console.log(data);
          });
    },
    pass: function(userId) {
      $http.get('/api/pass/' + userId)
          .success(function(data) {
            console.log(data);
          })
          .error(function(data) {
            console.log(data);
          });
    },
    message: function(userId, message) {
      $http.post('/api/message/' + userId, {msg: message})
          .success(function(data) {
            console.log(data);
          })
          .error(function(data) {
            console.log(data);
          });
    }
  };

  API.people();

});

app.controller('LoginController', function LoginController($scope, $http) {
  $scope.hasValidToken = function() {
    return docCookies.hasItem('logged_in');
  };
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

/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  Revision #1 - September 4, 2014
|*|
|*|  https://developer.mozilla.org/en-US/docs/Web/API/document.cookie
|*|  https://developer.mozilla.org/User:fusionchess
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path[, domain]])
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/
var docCookies = {
  getItem: function (sKey) {
    if (!sKey) { return null; }
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    if (!sKey) { return false; }
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};