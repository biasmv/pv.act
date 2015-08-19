
requirejs.config({
  'baseUrl' : 'src' ,
  paths : {
    pv : '/js/bio-pv.min'
  }
});


// on purpose outside of the require block, so we can inspect the viewer object 
// from the JavaScript console.
var viewer;

var pv;
require(['pv', 'pv-act'], function(PV, act) {


$(document).foundation();
pv = PV;
viewer = pv.Viewer(document.getElementById('viewer'), { 
    width : 'auto', height: 'auto', antialias : true, 
    outline : true, quality : 'medium', style : 'hemilight',
    selectionColor : 'white', transparency : 'screendoor',
    background : '#ccc', animateTime: 500, doubleClick : null
});


pv.io.fetchPdb('/pdbs/4ake.pdb', function(s) {
  viewer.on('viewerReady', function() {
    var go = viewer.cartoon('crambin', s);
    viewer.setRotation(pv.viewpoint.principalAxes(go));
    viewer.autoZoom();
  });
});


var LEVEL_ATOM = 0;
var LEVEL_RESIDUE = 1;
var LEVEL_CHAIN = 2;
var level = LEVEL_ATOM;


function extendSelectionChain(sel, extended) {
  // extend selection chain by chain
  sel.eachChain(function(c) {
    extended.addChain(c.full(), true);
  });
}
function extendSelectionResidues(sel, extended) {
  // extend selection chain by chain
  sel.eachChain(function(c) {
    // get index in full chain
    var allResidues = c.full().residues();
    var selectedResidues = c.residues();
    var toBeAdded = [];
    var alreadyAdded = {};
    for (var i = 0; i < selectedResidues.length; ++i) {
      var r = selectedResidues[i];
      var fullIndex = r.full().index();
      var currentIndex = fullIndex;
      while (currentIndex >=0 && 
             allResidues[fullIndex].ss() == allResidues[currentIndex].ss()) {
        var cr = allResidues[currentIndex];
        if (alreadyAdded[currentIndex] !== true) {
          toBeAdded.push(cr);
          alreadyAdded[currentIndex] = true;
        }
        currentIndex--;
      }
      currentIndex = fullIndex + 1;
      while (currentIndex < allResidues.length && 
             allResidues[fullIndex].ss() == allResidues[currentIndex].ss()) {
        var cr = allResidues[currentIndex];
        if (alreadyAdded[currentIndex] !== true) {
          toBeAdded.push(cr);
          alreadyAdded[currentIndex] = true;
        }
        currentIndex++;
      }
    }
    if (toBeAdded.length > 0) {
      var cv = extended.addChain(c);
      for (var j = 0; j < toBeAdded.length; ++j) {
        cv.addResidue(toBeAdded[j], true);
      }
    }
  });
}

function extendSelection(sel) {
  var extended = sel.full().createEmptyView();
  if (level == LEVEL_ATOM) {
  } else if (level == LEVEL_RESIDUE) {
    extendSelectionResidues(sel, extended);
  } else {
    extendSelectionChain(sel, extended);
  }
  if (extended.atomCount() > 0) {
    level = Math.min(level + 1, LEVEL_CHAIN);
  }  else {
    level = LEVEL_ATOM;
  }
  return extended;
}

var parent = document.getElementById('viewer');

viewer.on('mousemove', updateSpinAxis);
document.addEventListener('mouseup', stopSpinAxisUpdate);
viewer.on('mousedown', startSpinAxisUpdate);


var prevMousePos = null;

function startSpinAxisUpdate(ev) {
  if (ev.button !== 0) {
    return;
  }
  prevMousePos = {  x : ev.clientX, y : ev.clientY };
}

var lastSpinAxis = [0,1,0];
var lastSpeed = Math.PI/8;
function updateSpinAxis(ev) {
  if (ev.button !== 0 || prevMousePos === null || !viewer.spin()) {
    return;
  }
  var mousePos = {  x : ev.clientX, y : ev.clientY };
  var delta = { 
    x : mousePos.x - prevMousePos.x, 
    y : mousePos.y - prevMousePos.y 
  };
  prevMousePos = mousePos;
  var speed = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
  if (delta.x == 0 && delta.y == 0) {
    return;
  }
  delta.x /= speed;
  delta.y /= speed;
  lastSpinAxis = [-delta.y, -delta.x, 0.0];
  lastSpeed = 0.3;//0.01 * speed;
  if (viewer.spin()) {
    console.log(lastSpeed, lastSpinAxis);
    viewer.spin(lastSpeed, lastSpinAxis);
  }
}

function stopSpinAxisUpdate(ev) {
  if (ev.button !== 0) {
    return;
  }
  prevMousePos = null;
}

viewer.on('keydown', function(ev) {
  console.log(ev.which);
  var rotationSpeed = 0.05;
  if (ev.which === 32) {
    if (!viewer.spin()) {
      console.log(lastSpeed, lastSpinAxis);
      viewer.spin(lastSpeed, lastSpinAxis);
    } else {
      viewer.spin(false);
    }
    return;
  }
  if ((ev.which === 50 || ev.which === 52 || 
      ev.which === 54 || ev.which === 56) && ev.shiftKey) {
    rotationSpeed = 0.25;
    ev.preventDefault();
  }
  if (ev.which === 50) {
    viewer.rotate([1,0,0], Math.PI * rotationSpeed);
    return;
  }
  if (ev.which === 56) {
    viewer.rotate([1,0,0], -Math.PI * rotationSpeed);
    return;
  }
  if (ev.which === 52) {
    viewer.rotate([0,1,0], Math.PI * rotationSpeed);
    return;
  }
  if (ev.which === 54) {
    viewer.rotate([0,1,0], -Math.PI * rotationSpeed);
    return;
  }
  if (ev.which === 27) {
    act.deselectAll(viewer);
    return;
  }
  if (ev.which === 39) {
    act.selectNextResidue(viewer, ev.shiftKey);
    return;
  }
  if (ev.which === 37) {
    act.selectPrevResidue(viewer, ev.shiftKey);
    return;
  }
  if (ev.which === 76) {
    if (ev.metaKey) {
      ev.preventDefault();
    }
  }
  if (ev.which === 38) {
    console.log('extend selection');
    viewer.forEach(function(go) {
      if (go.selection !== undefined) {
        var extended = extendSelection(go.selection());
        go.setSelection(extended);
      }
    });
    viewer.requestRedraw();
  }
  if (ev.which === 13) {
    var allSelections = [];
    var atomCount = 0;
    viewer.forEach(function(go) {
      if (go.selection !== undefined) {
        atomCount += go.selection().atomCount();
        allSelections.push(go.selection());
      }
    });
    if (atomCount > 0 && !ev.shiftKey) {
      viewer.fitTo(allSelections);
    } else {
      viewer.autoZoom();
    } 
  }
});

$('#color-uniform').click(function() {
  act.colorSelected(viewer, pv.color.uniform('red'));
});

$('#color-chain').click(function() {
  act.colorSelected(viewer, pv.color.byChain());
});
$('#color-element').click(function() {
  act.colorSelected(viewer, pv.color.byElement());
});
$('#color-ss').click(function() {
  act.colorSelected(viewer, pv.color.bySS());
});

$('#color-ss-succ').click(function() {
  act.colorSelected(viewer, pv.color.ssSuccession());
});

$('#color-rainbow').click(function() {
  act.colorSelected(viewer, pv.color.rainbow('rnum'));
});

$('#visibility-hidden').click(function() {
  act.setOpacityOfSelected(viewer, 0.0);
});
$('#visibility-semi').click(function() {
  act.setOpacityOfSelected(viewer, 0.5);
});
$('#visibility-opaque').click(function() {
  act.setOpacityOfSelected(viewer, 1.0);
});

$('#sel-all').click(function() {
  act.selectAll(viewer);
});

$('#sel-deselect').click(function() {
  act.deselectAll(viewer);
});


viewer.on('click', function(picked, ev) {
  if (picked === null || picked.target() === null) {
    act.deselectAll(viewer);
    return;
  }
  if (picked.node().structure === undefined) {
    return;
  }
  if (ev.metaKey) {
    var sel = act.rangeSelectTo(picked.node().selection(), picked.target());
    picked.node().setSelection(sel);
    level = LEVEL_RESIDUE;
    viewer.requestRedraw();
    return;
  }
  if (ev.altKey) {
    var sel = act.extendSelectionToChain(picked.node().selection(), picked.target());
    picked.node().setSelection(sel);
    level = LEVEL_RESIDUE;
    viewer.requestRedraw();
    return;
  }
  var extendSelection = ev.shiftKey;
  level = LEVEL_RESIDUE;
  var sel;
  if (extendSelection) {
    sel = picked.node().selection();
  } else {
    sel = picked.node().selection();
    console.log(sel);
    if (sel.residueCount() !== 1 ||
        sel.atoms()[0].residue().full() !== picked.target().residue().full()) {
      sel = picked.node().structure().createEmptyView();
    }
  }
  if (!sel.removeAtom(picked.target(), true)) {
      // in case atom was not part of the view, we have to add it, because it 
      // wasn't selected before. Otherwise removeAtom took care of it.
      sel.addAtom(picked.target());
  } 
  picked.node().setSelection(sel);
  viewer.requestRedraw();
});


});
