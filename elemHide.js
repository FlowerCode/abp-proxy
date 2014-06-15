/*
 * This file is part of Adblock Plus <http://adblockplus.org/>,
 * Copyright (C) 2006-2014 Eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @fileOverview Element hiding implementation.
 */

var ElemHideException = require("./filterClasses").ElemHideException;

/**
 * Lookup table, filters by their associated key
 * @type Object
 */
var filterByKey = {__proto__: null};

/**
 * Lookup table, keys of the filters by filter text
 * @type Object
 */
var keyByFilter = {__proto__: null};

/**
 * Lookup table, keys are known element hiding exceptions
 * @type Object
 */
var knownExceptions = {__proto__: null};

/**
 * Lookup table, lists of element hiding exceptions by selector
 * @type Object
 */
var exceptions = {__proto__: null};

/**
 * Currently applied stylesheet URL
 * @type nsIURI
 */
var styleURL = null;

/**
 * Element hiding component
 * @class
 */
var ElemHide = exports.ElemHide =
{
  /**
   * Indicates whether filters have been added or removed since the last apply() call.
   * @type Boolean
   */
  isDirty: false,

  /**
   * Inidicates whether the element hiding stylesheet is currently applied.
   * @type Boolean
   */
  applied: false,

  /**
   * Called on module startup.
   */
  init: function()
  {

  },

  /**
   * Removes all known filters
   */
  clear: function()
  {
    filterByKey = {__proto__: null};
    keyByFilter = {__proto__: null};
    knownExceptions = {__proto__: null};
    exceptions = {__proto__: null};
    ElemHide.isDirty = false;
    ElemHide.unapply();
  },

  /**
   * Add a new element hiding filter
   * @param {ElemHideFilter} filter
   */
  add: function(filter)
  {
    if (filter instanceof ElemHideException)
    {
      if (filter.text in knownExceptions)
        return;

      var selector = filter.selector;
      if (!(selector in exceptions))
        exceptions[selector] = [];
      exceptions[selector].push(filter);
      knownExceptions[filter.text] = true;
    }
    else
    {
      if (filter.text in keyByFilter)
        return;

      var key;
      do {
        key = Math.random().toFixed(15).substr(5);
      } while (key in filterByKey);

      filterByKey[key] = filter;
      keyByFilter[filter.text] = key;
      ElemHide.isDirty = true;
    }
  },

  /**
   * Removes an element hiding filter
   * @param {ElemHideFilter} filter
   */
  remove: function(filter)
  {
    if (filter instanceof ElemHideException)
    {
      if (!(filter.text in knownExceptions))
        return;

      var list = exceptions[filter.selector];
      var index = list.indexOf(filter);
      if (index >= 0)
        list.splice(index, 1);
      delete knownExceptions[filter.text];
    }
    else
    {
      if (!(filter.text in keyByFilter))
        return;

      var key = keyByFilter[filter.text];
      delete filterByKey[key];
      delete keyByFilter[filter.text];
      ElemHide.isDirty = true;
    }
  },

  /**
   * Checks whether an exception rule is registered for a filter on a particular
   * domain.
   */
  getException: function(/**Filter*/ filter, /**String*/ docDomain) /**ElemHideException*/
  {
    var selector = filter.selector;
    if (!(filter.selector in exceptions))
      return null;

    var list = exceptions[filter.selector];
    for (var i = list.length - 1; i >= 0; i--)
      if (list[i].isActiveOnDomain(docDomain))
        return list[i];

    return null;
  },

  /**
   * Will be set to true if apply() is running (reentrance protection).
   * @type Boolean
   */
  _applying: false,

  /**
   * Will be set to true if an apply() call arrives while apply() is already
   * running (delayed execution).
   * @type Boolean
   */
  _needsApply: false,

  /**
   * Generates stylesheet URL and applies it globally
   */
  apply: function()
  {
    if (this._applying)
    {
      this._needsApply = true;
      return;
    }
  },

  _generateCSSContent: function()
  {

  },

  /**
   * Unapplies current stylesheet URL
   */
  unapply: function()
  {

  },

  /**
   * Retrieves an element hiding filter by the corresponding protocol key
   */
  getFilterByKey: function(/**String*/ key) /**Filter*/
  {
    return (key in filterByKey ? filterByKey[key] : null);
  },

  /**
   * Returns a list of all selectors active on a particular domain (currently
   * used only in Chrome, Opera and Safari).
   */
  getSelectorsForDomain: function(/**String*/ domain, /**Boolean*/ specificOnly)
  {
    var result = [];
    for (var key in filterByKey)
    {
      var filter = filterByKey[key];

      // it is important to always access filter.domains
      // here, even if it isn't used, in order to
      // workaround WebKit bug 132872, also see #419
      var domains = filter.domains;

      if (specificOnly && (!domains || domains[""]))
        continue;

      if (filter.isActiveOnDomain(domain) && !this.getException(filter, domain))
        result.push(filter.selector);
    }
    return result;
  }
};
