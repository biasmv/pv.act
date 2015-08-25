
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



function DisplayGroup(name, viewer, structure) {
  this._name = name
  this._viewer = viewer;
  this._structure = structure;
  this._water = null;
  this._protein = null;
  this._ligand = null;
}

DisplayGroup.prototype = {
  isWaterShown : function(show) {
    return this._water && this._water.visible();
  },
  isProteinShown : function() {
    return this._protein && this._protein.visible();
  },
  isLigandShown : function() {
    return this._ligand && this._ligand.visible();
  },

  selectAllWater : function() {
    if (this._water !== null) {
      this._water.setSelection(this._water.structure());
    }
  },
  selectAllLigands : function() {
    if (this._ligand !== null) {
      this._ligand.setSelection(this._ligand.structure());
    }
  },
  showWater: function(show) {
    if (show) {
      if (this._water === null) {
        this._water =  this._viewer.spheres(this._name + '.water', 
                                              this._structure.select({rnames : ['DOD', 'HOH']}));
      }
      this._water.show();
      this._viewer.requestRedraw();
    }
    if (!show && this._water !== null) {
      this._water.hide();
      this._viewer.requestRedraw();
    }
  },
  ligandStructure : function() {
    var ligands = this._structure.createEmptyView();
    // return everything that is not part of a trace and not a water molecule
    this._structure.eachChain(function(chain) {
      var traces = chain.backboneTraces();
      var residues = chain.residues();
      var inTrace = [];
      for (var i = 0; i < traces.length; ++i) {
        for (var j = 0; j < traces[i].length(); ++j) {
          var residue = traces[i].residueAt(j);
          inTrace[residue.index()] = true;
        }
      }
      var ligandChain = null;
      for (var i = 0; i < residues.length; ++i) {
        if (inTrace[i] === true || residues[i].isWater()) {
          continue;
        }
        if (!ligandChain) {
          ligandChain = ligands.addChain(chain);
        }
        ligandChain.addResidue(residues[i], true);
      }
    });
    return ligands;
  },
  showLigand : function(show) {
    if (show) {
      if (this._ligand === null) {
        var ligand = this.ligandStructure();
        this._ligand =  this._viewer.spheres(this._name + '.ligand', 
                                              ligand);
      }
      this._ligand.show();
      this._viewer.requestRedraw();
    }
    if (!show && this._ligand !== null) {
      this._ligand.hide();
      this._viewer.requestRedraw();
    }
  },
  showProtein : function(show) {
    if (show) {
      if (this._protein === null) {
        this._protein =  this._viewer.cartoon(this._name + '.protein', 
                                              this._structure);
      }
      this._protein.show();
      this._viewer.requestRedraw();
    }
    if (!show && this._protein !== null) {
      this._protein.hide();
      this._viewer.requestRedraw();
    }
  }
};

$(document).foundation();
pv = PV;
viewer = pv.Viewer(document.getElementById('viewer'), { 
    width : 'auto', height: 'auto', antialias : true, 
    outline : true, quality : 'medium', style : 'hemilight',
    selectionColor : 'white', transparency : 'screendoor',
    background : '#ccc', animateTime: 500, doubleClick : null
});


var displayGroups = [];
var pdb_name = '1r6a';
pv.io.fetchPdb('/pdbs/'+pdb_name+'.pdb', function(s) {
  displayGroups.push(new DisplayGroup(pdb_name, viewer, s));
  viewer.on('viewerReady', function() {
    displayGroups[0].showProtein(true);
    displayGroups[0].showLigand(true);
    viewer.setRotation(pv.viewpoint.principalAxes(displayGroups[0]._protein));
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
             allResidues[fullIndex].ss() === allResidues[currentIndex].ss()) {
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

function extendSelectionToResidues(sel, extended) {
  sel.eachChain(function(chain) {
    if (chain.residues().length === 0) {
      return;
    }
    var eChain = extended.addChain(chain);
    chain.eachResidue(function(residue) {
      eChain.addResidue(residue.full(), true);
    });
  });
}

function extendSelection(sel) {
  var extended = sel.full().createEmptyView();
  if (level === LEVEL_ATOM) {
    extendSelectionToResidues(sel, extended);
  } else if (level === LEVEL_RESIDUE) {
    extendSelectionResidues(sel, extended);
  } else {
    extendSelectionChain(sel, extended);
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
    viewer.spin(lastSpeed, lastSpinAxis);
  }
}

function stopSpinAxisUpdate(ev) {
  if (ev.button !== 0) {
    return;
  }
  prevMousePos = null;
}

function selectWater() {
  displayGroups.forEach(function(dg) {
    dg.selectAllWater();
  });
  viewer.requestRedraw();
}

function selectLigand() {
  displayGroups.forEach(function(dg) {
    dg.selectAllLigands();
  });
  viewer.requestRedraw();
}

viewer.on('keypress', function(ev) {
  // these must be on the keypress event because we need the translated 
  // key codes. The + for example might only be accessible when 
  // calculating through shift+keypress.
  if (ev.keyCode === 43 /* + */) {
    viewer.setZoom(viewer.zoom() * 0.95);
    viewer.requestRedraw();
  }
  if (ev.keyCode === 95 /* - */) {
    viewer.setZoom(viewer.zoom() * 1.05);
    viewer.requestRedraw();
  }
});


viewer.on('keydown', function(ev) {
  var rotationSpeed = 0.05;
  
  if (ev.which === 65 && ev.metaKey) {
    act.selectAll(viewer);
    ev.preventDefault();
    return;
  }
  if (ev.which === 76 && ev.metaKey) {
    selectLigand();
    ev.preventDefault();
    return;
  }
  if (ev.which === 32) {
    if (!viewer.spin()) {
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
    if (ev.altKey) {
      viewer.translate([0,1,0]);
    } else {
      viewer.rotate([1,0,0], Math.PI * rotationSpeed);
    }
    return;
  }
  if (ev.which === 56) {
    if (ev.altKey) {
      viewer.translate([0,-1,0]);
    } else {
      viewer.rotate([1,0,0], -Math.PI * rotationSpeed);
    }
    return;
  }
  if (ev.which === 52) {
    if (ev.altKey) {
      viewer.translate([-1,0,0]);
    } else {
      viewer.rotate([0,1,0], Math.PI * rotationSpeed);
    }
    return;
  }
  if (ev.which === 54) {
    if (ev.altKey) {
      viewer.translate([1,0,0]);
    } else {
      viewer.rotate([0,1,0], -Math.PI * rotationSpeed);
    }
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
    var atomCount = 0;
    viewer.forEach(function(go) {
      if (go.selection !== undefined) {
        var extended = extendSelection(go.selection());
        atomCount += extended.atomCount();
        go.setSelection(extended);
      }
    });
    if (atomCount > 0) {
      level = Math.min(level + 1, LEVEL_CHAIN);
    }  else {
      level = LEVEL_ATOM;
    }
    viewer.requestRedraw();
  }
  if (ev.which === 13) {
    if (ev.shiftKey) {
      viewer.autoZoom();
      return;
    }
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
  act.colorSelected(viewer, pv.color.byResidueProp('num'));
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

$('#sel-water').click(function() {
  selectWater();
});
$('#sel-ligands').click(function() {
  selectLigand();
});

$('#show-water').click(function() {
  displayGroups.forEach(function(dg) {
    dg.showWater(!dg.isWaterShown());
  });
});
$('#show-protein').click(function() {
  displayGroups.forEach(function(dg) {
    dg.showProtein(!dg.isProteinShown());
  });
});

$('#show-ligand').click(function() {
  displayGroups.forEach(function(dg) {
    dg.showLigand(!dg.isLigandShown());
  });
});

$('#sel-deselect').click(function() {
  act.deselectAll(viewer);
});


viewer.on('doubleClick', function(picked, ev) {
  if (picked === null || picked.target() === null) {
    return;
  }
  if (picked.node().structure === undefined) {
    return;
  }
  var newSel = act.extendSelectionToChain(picked.node().selection(), 
                                          picked.target());
  act.deselectAll(viewer);
  picked.node().setSelection(newSel);
  if (newSel.atomCount() > 0) {
    viewer.fitTo(newSel);
  }
  viewer.requestRedraw();
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
  if (picked.connectivity() == 'full') {
    level = LEVEL_ATOM;
  } else {
    level = LEVEL_RESIDUE;
  }
  var sel;
  if (extendSelection) {
    sel = picked.node().selection();
  } else {
    sel = picked.node().selection();
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
