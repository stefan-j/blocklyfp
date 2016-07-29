/*
Copyright 2016 Stefan Jacholke. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * @fileoverview Functions for letting defining user types.
 * @author stefanjacholke@gmail.com (Stefan Jacholke)
 */
'use strict';

goog.provide('Blockly.UserTypes');

goog.require('Blockly.Blocks');
goog.require('Blockly.Field');
goog.require('Blockly.Names');
goog.require('Blockly.Workspace');


/**
 * Returns an xml list of blocks for the types flyout.
 * @param {!Blockly.Workspace} workspace The workspace, it gets ignored though
 */
Blockly.UserTypes.builtins = ["Bool", "Number", "Color", "Picture", "Text"];

Blockly.UserTypes.dataFlyoutCategory = function(workspace){

  var xmlList = [];
  var staticBlocks = ["type_sum", "type_product", "type_list"];
  staticBlocks.forEach(function(blockName){
    Blockly.UserTypes.addBlockToXML(blockName, xmlList);
  });

  var userBlocks = Blockly.UserTypes.builtins;
  userBlocks.forEach(function(name){
    Blockly.UserTypes.addUserType(name, xmlList);
  });

  // Generate a type block for each user data type
  Blockly.UserTypes.addUserTypes(xmlList);

  // Generate a case for each data type
  Blockly.UserTypes.generateCases(xmlList);

  // Generate all constructor
  Blockly.UserTypes.generateConstructors(xmlList);

  return xmlList;
};

/**
 * Adds the specified block name to the xmlList.
 * @param {!String} blockName The type of the block
 * @param {!Object} xmlList List of current blocks
 */
Blockly.UserTypes.addBlockToXML = function(blockName, xmlList){
  if (Blockly.Blocks[blockName]) {
    var block = goog.dom.createDom('block');
    block.setAttribute('type', blockName);
    block.setAttribute('gap', 16);
    xmlList.push(block);

  }
};

Blockly.UserTypes.addUserType = function(name, xmlList){
    var mutation = goog.dom.createDom('mutation');
    mutation.setAttribute('name',name);

    var block = goog.dom.createDom('block');
    block.setAttribute('type','type_user');
    block.setAttribute('gap',16);
    block.appendChild(mutation);

    xmlList.push(block);
}

/**
 * Adds the user specified types on the main workspace to the toolbox.
 * @param {!Object} xmlList List of current blocks
 */
Blockly.UserTypes.addUserTypes = function(xmlList){
  var blocks = Blockly.getMainWorkspace().getTopBlocks();
  blocks.forEach(function(block){
    if (block.type == 'type_sum')
    {
      var name = block.getFieldValue('NAME');
      Blockly.UserTypes.addUserType(name, xmlList);
    }
  });
};

/**
 * Adds the a case block for each user defined type to the toolbox 
 * @param {!Object} xmlList List of current blocks
 */
Blockly.UserTypes.generateCases = function(xmlList){
  var blocks = Blockly.getMainWorkspace().getTopBlocks();
  blocks.forEach(function(block){
    if (block.type == 'type_sum')
    {
      var name = block.getFieldValue('NAME');
      var mutation = goog.dom.createDom('mutation');
      mutation.setAttribute('name',block.getFieldValue('NAME'));
      var count = 0;
      for(var i = 0; i < block.itemCount_; i++) {
        var product = block.getInputTargetBlock('PROD' + i);
        if(!product) continue; // Maybe error here 
        var prodDom = goog.dom.createDom('product');
        prodDom.setAttribute('constructor', product.getFieldValue('CONSTRUCTOR'));

        // Get product types
        var typeCount = 0;
        for(var j = 0; j < product.itemCount_; j++)
        {
          var typeBlock = product.getInputTargetBlock('TP' + j);
          if(!typeBlock)
            continue;
          var typeDom;
          if(typeBlock.getType){
            typeDom = typeBlock.getType().toDom();
          } else {
            typeDom= goog.dom.createDom('type');
            var typeName = typeBlock.getFieldValue('NAME');
            typeDom.setAttribute('name',typeName);
          }
          prodDom.appendChild(typeDom);
          typeCount++;
        }
        prodDom.setAttribute('items',typeCount);
        mutation.appendChild(prodDom); 
        count++;
      }
      mutation.setAttribute('items',count);
      var block = goog.dom.createDom('block');
      block.setAttribute('type','expr_case');
      block.setAttribute('gap',16);
      block.appendChild(mutation);

      xmlList.push(block);
    }
  });
};

/**
 * Adds a constructor block for each user defined product type to the toolbox 
 * @param {!Object} xmlList List of current blocks
 */
Blockly.UserTypes.generateConstructors = function(xmlList){
  var blocks = Blockly.getMainWorkspace().getAllBlocks(false);
  blocks.forEach(function(block){
    if(block.type == 'type_product')
    {
      if(block.outputConnection.isConnected())
      {
        var parentBlock = block.outputConnection.targetBlock();
        var userTypeName = parentBlock.getFieldValue('NAME');

        var name = block.getFieldValue('CONSTRUCTOR');
        var types = [];
        
        for(var i =0; i < block.itemCount_; i++){
          var typeBlock = block.getInputTargetBlock('TP' + i);
          if(!typeBlock) continue;
          types.push(typeBlock);
        }

        // Create dom
        var block = goog.dom.createDom('block');
        block.setAttribute('type', 'expr_constructor');
        block.setAttribute('items', 10);
        block.setAttribute('gap', 16);
        var mutation = goog.dom.createDom('mutation');
        mutation.setAttribute('items',types.length);
        mutation.setAttribute('name',name );
        mutation.setAttribute('output',userTypeName);
        types.forEach(function(typeBlock){
          var typeDom;
          if(typeBlock.getType){
            typeDom = typeBlock.getType().toDom();
          } else {
            typeDom= goog.dom.createDom('type');
            typeDom.setAttribute(typeBlock.getAttribute('NAME'));
          }
          mutation.appendChild(typeDom);
        });
        block.appendChild(mutation);
        xmlList.push(block);
      }
    }
  });
};


Blockly.UserTypes.isLegalConstructorName = function(name, workspace, opt_exclude) {
  var blocks = workspace.getAllBlocks();
  // Iterate through every block and check the name.
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if(block.type != 'type_product') continue;

    if (block == opt_exclude) continue;
    
    var constructorName = block.getFieldValue('CONSTRUCTOR');
    if(constructorName == name)
      return false;
  }
  return true;
};

Blockly.UserTypes.isLegalTypeName = function(name, workspace, opt_exclude) {

  
  if(Blockly.UserTypes.builtins.indexOf(name) >= 0)
    return false;

  var blocks = workspace.getAllBlocks();
  // Iterate through every block and check the name.
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if(block.type != 'type_sum') continue;

    if (block == opt_exclude) continue;
    
    var constructorName = block.getFieldValue('NAME');
    if(constructorName == name)
      return false;
  }
  return true;
};



Blockly.UserTypes.findLegalName = function(name,isLegalFunc, block) {
  if (block.isInFlyout) {
    return name;
  }


  // if(/[^A-Z_]/.test( name[0] ) )
  //   return false; // functions may not start with non-alpha numeric chars

  // if(/[^a-zA-Z0-9_]/.test( name ) )
  //   return false;

  name = name.replace(/[^0-9a-z_]/gi, '')

  if(name == '')
    name = 'UserType';
  if(/[^A-Z_]/.test( name[0] ) )
    name = name.charAt(0).toUpperCase() + name.slice(1); // Make first letter uppercase

  while (!isLegalFunc(name, block.workspace, block)) {
    // Collision with another procedure.
    var r = name.match(/^(.*?)(\d+)$/);
    if (!r) {
      name += '2';
    } else {
      name = r[1] + (parseInt(r[2], 10) + 1);
    }
  }
  return name;
};

Blockly.UserTypes.findConstructorName = function(name, block){
  return Blockly.UserTypes.findLegalName(name, Blockly.UserTypes.isLegalConstructorName, block);
};

Blockly.UserTypes.findTypeName = function(name, block){
  return Blockly.UserTypes.findLegalName(name, Blockly.UserTypes.isLegalTypeName, block);
};

Blockly.UserTypes.renameProduct = function(text) {

  // Stefan
  // Check if names conform to Haskell def requirements
  if(/[^A-Z_]/.test( text[0] ) )
    return null; // functions may not start with non-alpha numeric chars

  if(/[^a-zA-Z0-9_]/.test( text ) )
    return null;

  //if(!Blockly.UserTypes.isLegalConstructorName(text, Blockly.getMainWorkspace(), this.sourceBlock_))
  //  return null;

  text = text.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');

  text = Blockly.UserTypes.findConstructorName(text, this.sourceBlock_);
  // Rename any callers.
  var blocks = this.sourceBlock_.workspace.getAllBlocks();
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if(block.type != 'expr_constructor') continue;
    if(block.getFieldValue('NAME') == this.text_)
      block.setFieldValue(text, 'NAME');
  }
  return text;
};

Blockly.UserTypes.renameType = function(text) {

  // Stefan
  // Check if names conform to Haskell def requirements
    //if(!Blockly.UserTypes.isLegalTypeName(text, Blockly.getMainWorkspace(), this.sourceBlock_))
  //  return null;



  text = text.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');

  text = Blockly.UserTypes.findTypeName(text, this.sourceBlock_);
  // Rename any callers.
  var blocks = this.sourceBlock_.workspace.getAllBlocks();
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if(block.type != 'type_user') continue;
    if(block.getFieldValue('NAME') == this.text_)
      block.setFieldValue(text, 'NAME');
  }
  return text;
};

