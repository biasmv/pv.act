define(['pv'], function(pv) {

function deselectAll(viewer) {
  viewer.forEach(function(go) {
    if (go.selection === undefined) {
      return;
    }
    go.setSelection(go.structure().createEmptyView());
  });
  viewer.requestRedraw();
}

function selectAll(viewer) {
  viewer.forEach(function(go) {
    if (go.selection === undefined) {
      return;
    }
    go.setSelection(go.structure());
  });
  viewer.requestRedraw();
}

function setOpacityOfSelected(viewer, opacity) {
  viewer.forEach(function(go) {
    if (go.selection === undefined) {
      return;
    }
    go.setOpacity(opacity, go.selection());
  });
  viewer.requestRedraw();
}

function colorSelected(viewer, colorOp) {
  viewer.forEach(function(go) {
    if (go.selection === undefined) {
      return;
    }
    go.colorBy(colorOp, go.selection());
  });
  viewer.requestRedraw();
}


function selectNextResidue(viewer, extendSelection) {
  viewer.forEach(function(go) {
    if (go.selection === undefined) {
      return;
    }
    var sel = extendSelection ? go.selection() : go.structure().createEmptyView();
    go.selection().eachChain(function(chain) {
      // find residue with highest index
      var maxIndex = 0;
      chain.eachResidue(function(r) {
        maxIndex = Math.max(r.full().index(), maxIndex);
      });
      var next = maxIndex + 1;
      if (next >= chain.full().residues().length) {
        if (extendSelection) {
          return;
        }
        next = maxIndex;
      }
      var selChain = sel.chain(chain.name());
      if (!selChain) {
        selChain = sel.addChain(chain);
      }
      selChain.addResidue(chain.full().residues()[next], true);
      
    });
    go.setSelection(sel);
  });
  viewer.requestRedraw();
}

function selectPrevResidue(viewer, extendSelection) {
  viewer.forEach(function(go) {
    if (go.selection === undefined) {
      return;
    }
    var sel = extendSelection ? go.selection() : go.structure().createEmptyView();
    go.selection().eachChain(function(chain) {
      // find residue with highest index
      var minIndex = chain.residues()[0].full().index();
      chain.eachResidue(function(r) {
        minIndex = Math.min(r.full().index(), minIndex);
      });
      var prev = minIndex - 1;
      if (prev < 0) {
        if (extendSelection) {
          return;
        }
        prev = 0;
      }
      var selChain = sel.chain(chain.name());
      if (!selChain) {
        selChain = sel.addChain(chain);
      }
      selChain.addResidue(chain.full().residues()[prev], true);
    });
    go.setSelection(sel);
  });
  viewer.requestRedraw();
}

function rangeSelectTo(sel, atom) {
  var targetIndex = atom.full().residue().index();
  var targetChain = atom.residue().chain().name();
  var extended = sel.createEmptyView();

  sel.eachChain(function(chain) {
    if (chain.name() !== targetChain) {
      extended.addChain(chain, true);
      return;
    }
    var residues = chain.residues();
    if (residues.length === 0) {
      extended.addResidue(atom.residue().full(), true);
      return;
    }
    var minIndex = residues[0].full().index();
    var maxIndex = minIndex;
    for (var i = 1; i < residues.length; ++i) {
      var index = residues[i].full().index();
      minIndex = Math.min(index, minIndex);
      maxIndex = Math.max(index, maxIndex);
    }
    console.log(minIndex, maxIndex, targetIndex);
    if (minIndex < targetIndex) {
      maxIndex = targetIndex;
    } else {
      minIndex = targetIndex;
    }
    var allResidues = chain.full().residues();
    var chain = null;
    for (var j = 0; j < allResidues.length; ++j) {
      var residue = allResidues[j];
      var index = allResidues[j].index();
      if (index < minIndex || index > maxIndex) {
        continue;
      }
      if (chain === null) {
        chain = extended.addChain(residue.chain());
      }
      chain.addResidue(residue.full(), true);
    }
  });
  return extended;
}

function extendSelectionToChain(sel, atom) {
  var targetChain = atom.residue().chain().name();
  var extended = sel.createEmptyView();
  sel.eachChain(function(chain) {
    if (chain.name() !== targetChain) {
      extended.addChain(chain, true);
      return;
    }
  });
  extended.addChain(atom.residue().chain().full(), true);
  return extended;
}

function expandSelection(sel, atom) {
  var targetIndex = atom.full().residue().index();
  var targetChain = atom.residue().chain().name();
  var extended = sel.createEmptyView();

  sel.eachChain(function(chain) {
    if (chain.name() !== targetChain) {
      extended.addChain(chain, true);
      return;
    }
    var residues = chain.residues();
    if (residues.length === 0) {
      extended.addResidue(atom.residue().full(), true);
      return;
    }
    var minIndex = residues[0].full().index();
    var maxIndex = minIndex;
    for (var i = 1; i < residues.length; ++i) {
      var index = residues[i].full().index();
      minIndex = Math.min(index, minIndex);
      maxIndex = Math.max(index, maxIndex);
    }
    console.log(minIndex, maxIndex, targetIndex);
    if (minIndex < targetIndex) {
      maxIndex = targetIndex;
    } else {
      minIndex = targetIndex;
    }
    var allResidues = chain.full().residues();
    var chain = null;
    for (var j = 0; j < allResidues.length; ++j) {
      var residue = allResidues[j];
      var index = allResidues[j].index();
      if (index < minIndex || index > maxIndex) {
        continue;
      }
      if (chain === null) {
        chain = extended.addChain(residue.chain());
      }
      chain.addResidue(residue.full(), true);
    }
  });
  return extended;
}

function extendSelectionToHsc(sel) {
  var extended = sel.createEmptyView();
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
  return extended;
}

return {
  rangeSelectTo : rangeSelectTo,
  extendSelectionToHsc : extendSelectionToHsc,
  colorSelected : colorSelected,
  setOpacityOfSelected : setOpacityOfSelected,
  deselectAll : deselectAll,
  selectAll : selectAll,
  extendSelectionToChain : extendSelectionToChain,
  selectNextResidue : selectNextResidue,
  selectPrevResidue : selectPrevResidue
};

});

