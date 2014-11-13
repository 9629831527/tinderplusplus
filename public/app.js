var app = angular.module('tinder++', ['restangular']);

app.config(function (RestangularProvider) {
//    RestangularProvider.setBaseUrl('/api');
  RestangularProvider.addResponseInterceptor(function (data, operation, what, url, response, deferred) {
    return data.results;
  });
});

app.controller('TinderController', function TinderController($scope, Restangular) {
  $scope.peopleIndex = 0;
  var newPeople = Restangular.all('people.json');
  newPeople.getList().then(function (data) {
    $scope.allPeople = data;
  });

  $scope.$on('cardsRendered', function() {
    initCards();
  });

  var initCards = function() {
    var cards = [].slice.call($('.tinder-card'));

    var config = {
      throwOutConfidence: function (offset, element) {
        return Math.min(Math.abs(offset) / (element.offsetWidth / 3), 1);
      }
    };
    window.stack = gajus.Swing.Stack(config);

    cards.forEach(function (targetElement) {
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

    stack.on('dragmove', function (e) {
      if (!$passOverlay || !$likeOverlay) {
        $passOverlay = $(e.target).children('.pass-overlay');
        $likeOverlay = $(e.target).children('.like-overlay');
      }
      if (e.throwDirection < 0) { // left
        pass(e.throwOutConfidence);
      } else { // right
        like(e.throwOutConfidence);
      }
    });

    stack.on('dragend', function(e) {
      $passOverlay = null;
      $likeOverlay = null;
    });

    Mousetrap.bind('left', function () {
      var cardEl = cards[cards.length - $scope.peopleIndex - 1];
      var card = stack.getCard(cardEl);
      card.throwOut(-100, -50);
      $passOverlay = $(cardEl).children('.pass-overlay');
      $likeOverlay = $(cardEl).children('.like-overlay');
      pass(1);
    });

    Mousetrap.bind('right', function () {
      var cardEl = cards[cards.length - $scope.peopleIndex - 1];
      var card = stack.getCard(cardEl);
      card.throwOut(100, -50);
      $passOverlay = $(cardEl).children('.pass-overlay');
      $likeOverlay = $(cardEl).children('.like-overlay');
      like(1);
    });
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
