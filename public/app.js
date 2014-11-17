var app = angular.module('tinder++', ['restangular', 'ngAutocomplete']);

app.config(function (RestangularProvider) {
//    RestangularProvider.setBaseUrl('/api');
  RestangularProvider.addResponseInterceptor(function (data, operation, what, url, response, deferred) {
    return data.results;
  });
});

app.controller('TinderController', function TinderController($scope, Restangular, $http, $timeout) {
  $scope.allPeople = [];
  $scope.autocompleteOptions = {
    types: '(cities)'
  };

  $scope.swapPhoto = function(index) {
    $scope.allPeople[$scope.peopleIndex].photoIndex = index;
  };

  $scope.watchAutocomplete = function () { return $scope.details; };
  $scope.$watch($scope.watchAutocomplete, function (details) {
    if (details) {
      updateLocation(details.geometry.location.k, details.geometry.location.B);
    }
  }, true);

  $scope.peopleIndex = 0;
  var newPeople = Restangular.all('people.json');
  newPeople.getList().then(function (data) {
    $scope.allPeople = data;
    $.map($scope.allPeople, function(person) {
      person.photoIndex = 0;
    });
  });

  $scope.$on('cardsRendered', function() {
    initCards();
  });

  var updateLocation = function(lat, lng) {
//    $http.get('/api/location/' + lat + '/' + lng)
//        .success(function(data, status, headers, config) {
//          alert('updated location');
//        })
//        .error(function(data, status, headers, config) {
//          alert(data);
//        });
    alert('updated location!');
  };

  var initCards = function() {
    $scope.cards = [].slice.call($('.tinder-card'));

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
      $(e.target).fadeOut(750);
    });

    stack.on('throwin', function (e) {
      $('.pass-overlay, .like-overlay').css('opacity', 0);
    });

    stack.on('dragmove', function (obj) {
      obj.origEvent.srcEvent.preventDefault();
      if (!$passOverlay || !$likeOverlay) {
        $passOverlay = $(obj.target).children('.pass-overlay');
        $likeOverlay = $(obj.target).children('.like-overlay');
      }
      if (obj.throwDirection < 0) { // left
        pass(obj.throwOutConfidence);
      } else { // right
        like(obj.throwOutConfidence);
      }
    });

    stack.on('dragend', function(e) {
      $passOverlay = null;
      $likeOverlay = null;
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

function resetOpacity() {
  $passOverlay.css('opacity', 0);
  $likeOverlay.css('opacity', 0);
}
