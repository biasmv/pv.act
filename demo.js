
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
    selectionColor : 'white',
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

viewer.on('keydown', function(ev) {
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
    viewer.forEach(function(go) {
      if (go.selection !== undefined) {
        allSelections.push(go.selection());
      }
    });
    viewer.fitTo(allSelections);
  }
});


viewer.on('click', function(picked, ev) {
  if (picked === null || picked.target() === null) {
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
  var extendSelection = ev.shiftKey;
  level = LEVEL_RESIDUE;
  var sel;
  if (extendSelection) {
    sel = picked.node().selection();
  } else {
    sel = picked.node().structure().createEmptyView();
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
