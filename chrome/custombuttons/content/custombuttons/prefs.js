function Prefs () {}
Prefs. prototype =
{
 _ps: null,
 get ps ()
 {
  if (!this. _ps)
  {
   this. _ps = Components. classes ["@mozilla.org/preferences-service;1"]. getService (Components. interfaces. nsIPrefService);
   this. _ps = this. _ps. QueryInterface (Components. interfaces. nsIPrefBranch);
  }
  return this. _ps;
 },

 handleCheckboxes: function (mode)
 {
  var setCheckboxesFlag = (mode || (mode == 0));
  var cbks = document. getElementsByTagName ("checkbox");
  var mask, num, result = 0;
  for (var i = 0; i < cbks. length; i++)
  {
   num = cbks [i]. id. match (/modebit(\d+)$/);
   if (!num)
    continue;
   mask = 1 << num [1];
   if (setCheckboxesFlag)
    cbks [i]. checked = ((mode & mask) == mask);
   else
    result |= cbks [i]. checked? mask: 0;
  }
  return result;
 },

    onLoad: function ()
    {
  var cbps = this. ps. getBranch ("custombuttons.");
  var mode = cbps. getIntPref ("mode");
  this. handleCheckboxes (mode);
        return true;
    },

    onAccept: function ()
    {
        var mode = this. handleCheckboxes (null);
  var cbps = this. ps. getBranch ("custombuttons.");
  cbps. setIntPref ("mode", mode);
        return true;
    },

    onCancel: function ()
    {
        return true;
    }
};

function TBPrefs () {}
TBPrefs. prototype =
{
 pn: "network.protocol-handler.expose.custombutton",

 _checkbox: null,
 get checkbox ()
 {
  if (!this. _checkbox)
   this. _checkbox = document. getElementById ("cbEnableCBProtocol");
  return this. _checkbox;
 },

 onLoad: function ()
 {
  this. __super. prototype. onLoad. apply (this, []);
  var state = this. ps. prefHasUserValue (this. pn) &&
     this. ps. getBoolPref (this. pn);
  this. checkbox. setAttribute ("checked", state);
  this. checkbox. removeAttribute ("hidden"); // checkbox visible only in Thunderbird
  return true;
 },

 onAccept: function ()
 {
  this. __super. prototype. onAccept. apply (this, []);
  if (this. checkbox. hasAttribute ("checked") &&
   (this. checkbox. getAttribute ("checked") == "true"))
  {
   this. ps. setBoolPref (this. pn, true);
  }
  else if (this. ps. prefHasUserValue (this. pn))
  {
   try
   {
    this. ps. deleteBranch (this. pn);
   }
   catch (e)
   {
    this. ps. setBoolPref (this. pn, false);
   }
  }
  return true;
 }
};
TBPrefs. prototype. __proto__ = Prefs. prototype; TBPrefs. prototype. __super = Prefs;

var cbPrefs = new custombuttonsFactory (). Prefs;
