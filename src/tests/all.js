"use strict";

blanket.options('existingRequireJS', true);

function addCustomAssertions(QUnit) {
  // contains a few assertions we use for testing
  QUnit.assert.almostEqual = function(actual, expected, epsilon, message) {
    epsilon = epsilon || 0.000001;
    var passes = Math.abs(actual -expected) < epsilon;
    QUnit.push(passes, actual, expected, message);
  }

  QUnit.assert.mat4Equal = function(actual, expected, epsilon, message) {
    for (var i = 0; i < 16; ++i) {
      QUnit.assert.almostEqual(actual[i], expected[i], epsilon, message);
    }
  }

  QUnit.assert.mat3Equal = function(actual, expected, epsilon, message) {
    for (var i = 0; i < 9; ++i) {
      QUnit.assert.almostEqual(actual[i], expected[i], epsilon, message);
    }
  }

  QUnit.assert.vec3Equal = function(actual, expected, epsilon, message) {
    for (var i = 0; i < 3; ++i) {
      QUnit.assert.almostEqual(actual[i], expected[i], epsilon, message);
    }
  }

  QUnit.assert.vec2Equal = function(actual, expected, epsilon, message) {
    for (var i = 0; i < 2; ++i) {
      QUnit.assert.almostEqual(actual[i], expected[i], epsilon, message);
    }
  }

  QUnit.assert.vec4Equal = function(actual, expected, epsilon, message) {
    for (var i = 0; i < 4; ++i) {
      QUnit.assert.almostEqual(actual[i], expected[i], epsilon, message);
    }
  }

  QUnit.assert.viewEqual = function(actual, expected) {
    var assert = QUnit.assert;
    for (var i in expected) {
      if (expected.hasOwnProperty(i)) {
        QUnit.push(actual.chain(i) != null, 
                  'view is missing chain "' + i + '"');
      }
    }
    var chains = actual.chains();
    for (var i = 0; i < chains.length; ++i) {
      var chain = chains[i];
      QUnit.push(expected[chain.name()] !== undefined, 
                 'view contains unexpected chain "' + chain.name() + '"');
      var expectedChain = expected[chain.name()];
      if (expectedChain == undefined) {
        continue;
      }
      var res = chain.residues();
      QUnit.push(res.length === expectedChain.length, 
                 'chain "'+chain.name()+'": number of residues does not match');
      if (res.length !== expectedChain.length) {
        continue;
      }
      for (var j = 0; j < expectedChain.length; ++j) {
        assert.strictEqual(res[j].num(), expectedChain[j]);
      }
    }
    
  }
}

addCustomAssertions(QUnit);

requirejs.config({
  'baseUrl' : 'src' ,
  paths : {
    pv : '/js/bio-pv.min'
  }
});

var UNIT_TESTS = [
  'tests/selection',
];

// require the unit tests.
require(UNIT_TESTS, function() {
  console.log('loaded unit tests', UNIT_TESTS);
  // manually call setupCoverage to avoid "you must call setupCoverage" 
  // errors.
  blanket.noConflict().setupCoverage();
  QUnit.load();
  QUnit.start();
});
