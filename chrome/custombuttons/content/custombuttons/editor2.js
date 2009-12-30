    function dLOG (text)
    {
          var consoleService = Components. classes ["@mozilla.org/consoleservice;1"]. getService (Components. interfaces. nsIConsoleService);
          consoleService. logStringMessage (text);
    }
    function dEXTLOG (aMessage, aSourceName, aSourceLine, aLineNumber,
              aColumnNumber, aFlags, aCategory)
    {
      var consoleService = Components. classes ["@mozilla.org/consoleservice;1"]. getService (Components. interfaces. nsIConsoleService);
      var scriptError = Components. classes ["@mozilla.org/scripterror;1"]. createInstance (Components. interfaces. nsIScriptError);
      scriptError. init (aMessage, aSourceName, aSourceLine, aLineNumber,
                 aColumnNumber, aFlags, aCategory);
      consoleService. logMessage (scriptError);
    }
function Editor () {}
Editor. prototype =
{
 opener: null,
 cbService: null,
 notificationPrefix: "",
 param: {},
 CNSISS: Components. interfaces. nsISupportsString,
 tempId: "",

 QueryInterface: function (iid)
 {
  if (iid. equals (Components. interfaces. nsIObserver) ||
   iid. equals (Components. interfaces. nsIWeakReference) ||
   iid. equals (Components. interfaces. nsISupports))
   return this;
  return Components. results. NS_ERROR_NO_INTERFACE;
 },

 QueryReferent: function (iid)
 {
  return this. QueryInterface (iid);
 },

 init: function ()
 {
  this. cbService = Components. classes ["@xsms.nm.ru/custombuttons/cbservice;1"]. getService (Components. interfaces. cbICustomButtonsService);
  if (!window. arguments || !window. arguments [0])
  {
   var ios = Components. classes ["@mozilla.org/network/io-service;1"]. getService (Components. interfaces. nsIIOService);
   var url = ios. newURI (document. documentURI, null, null);
   url = url. QueryInterface (Components. interfaces. nsIURL);
   var q = url. query || "";
   var windowId = q. match (/&?window=(\w*?)&?/);
   var buttonId = q. match (/&?id=(custombuttons-button\d+)&?/);
   var info = Components. classes ["@mozilla.org/xre/app-info;1"]. getService (Components. interfaces. nsIXULAppInfo);
   windowId = windowId? windowId [1]: info. name;
   if (windowId. indexOf (info. name) != 0)
    windowId = info. name;
   buttonId = buttonId? buttonId [1]: "";
   var link = "custombutton://buttons/" + windowId + "/edit/" + buttonId;
   this. param = this. cbService. getButtonParameters (link). wrappedJSObject;
  }
  else
   this. param = window. arguments [0]. wrappedJSObject;
  this. notificationPrefix = this. cbService. getNotificationPrefix (this. param. windowId);
  var os = Components. classes ["@mozilla.org/observer-service;1"]. getService (Components. interfaces. nsIObserverService);
  os. addObserver (this, this. notificationPrefix + "updateImage", false);
  os. addObserver (this, this. notificationPrefix + "setEditorParameters", false);
  this. setValues ();
  document. getElementById ("name"). focus ();
  if (this. param. editorParameters)
   this. setEditorParameters (this. param);
  this. tempId = this. param. id || (new Date (). valueOf ());
  var ps = Components. classes ["@mozilla.org/preferences-service;1"]. getService (Components. interfaces. nsIPrefService). getBranch ("custombuttons.");
  var cbMode = ps. getIntPref ("mode");
  var sab = cbMode & 2;
  if (this. param. newButton || !sab)
  {
   document. documentElement. getButton ("extra2"). setAttribute ("hidden", "true");
   document. getElementById ("cbUpdateButtonCommand"). setAttribute ("disabled", "true");
  }
 },

 setEditorParameters: function (param)
 {
  var editorParameters = param. wrappedJSObject. editorParameters;
  if (editorParameters instanceof Components. interfaces. nsISupportsArray)
  {
   window. focus ();
   var phase = editorParameters. GetElementAt (0). QueryInterface (Components. interfaces. nsISupportsString);
   var lineNumber = parseInt (editorParameters. GetElementAt (1). QueryInterface (Components. interfaces. nsISupportsString));
   var tabbox = document. getElementById ("custombuttons-editbutton-tabbox");
   tabbox. selectedIndex = (phase == "code")? 0: 1;
   var textboxId = (phase == "code")? "code": "initCode";
   var textbox = document. getElementById (textboxId);
   textbox. focus ();
   textbox. selectLine (lineNumber);
   //textbox. scrollTo (lineNumber);
  }
 },

 setValues: function ()
 {
  var field;
  for (var v in this. param)
  {
   var field = document. getElementById (v);
   if (field && this. param [v])
    field. value = this. param [v];
  }
  document. getElementById ("code"). editor. transactionManager. clear ();
  document. getElementById ("initCode"). editor. transactionManager. clear ();
  var mode = this. param. mode;
  document. getElementById ("initInCustomizeToolbarDialog"). checked = mode && (mode & 1) || false;
  document. getElementById ("disableDefaultKeyBehavior"). checked = mode && (mode & 2) || false;
  if (this. param. newButton)
   document. title = this. cbService. getLocaleString ("AddButtonEditorDialogTitle");
  if (this. param. name)
   document. title += ": " + this. param. name;
  else if (this. param. id)
   document. title += ": " + this. param. id;
 },

 updateButton: function ()
 {
  var uri = document. getElementById ("urlfield-textbox"). value;
  if (uri)
  {
   if (this. param. newButton)
   {
    return this. cbService. installWebButton (this. param, uri, true);
   }
   else
   {
    var link = this. cbService. makeButtonLink (this. param. windowId, "update", this. param. id);
    return this. cbService. updateButton (link, uri);
   }
  }
  var field;
  for (var v in this. param)
  {
   field = document. getElementById (v);
   if (field)
    this. param [v] = field. value;
  }
  this. param ["mode"] = document. getElementById ("initInCustomizeToolbarDialog"). checked? 1: 0;
  this. param ["mode"] |= document. getElementById ("disableDefaultKeyBehavior"). checked? 2: 0;
  this. cbService. installButton (this. param);
  return true;
 },

 get canClose ()
 {
  if (!window. opener && !window. arguments)
   return false;
  return true;
 },

 onAccept: function ()
 {
  if (this. updateButton ())
   return this. canClose;
  return false;
 },

 selectImage: function ()
 {
  var fp = Components. classes ["@mozilla.org/filepicker;1"]. createInstance (Components. interfaces. nsIFilePicker);
  fp. init (window, "Select an image", 0);
  fp. appendFilters (fp. filterImages);
  var res = fp. show ();
  if (res == fp. returnOK)
   document. getElementById ("image"). value = fp. fileURL. spec;
 },

 execute_oncommand_code: function ()
 {
  var fe = document. commandDispatcher. focusedElement;
  var box = document. getElementById ("code");
  if (fe != box. textbox. inputField)
   return;
  var code = box. value;
  var opener = window. opener;
  if (!opener)
  {
   try
   {
    opener = window. QueryInterface (Components. interfaces. nsIInterfaceRequestor).
       getInterface (Components. interfaces. nsIWebNavigation).
       QueryInterface (Components. interfaces. nsIDocShellTreeItem).
       rootTreeItem. QueryInterface (Components. interfaces. nsIInterfaceRequestor).
       getInterface (Components. interfaces. nsIDOMWindow);
   }
   catch (e) {};

  }
  if (opener)
  {
   var CB = opener. custombuttons;
   if (CB)
   {
    var doc = opener. document;
    var button = doc. getElementById (this. param. id);
    if (button)
     CB. execute_oncommand_code (code, button);
    else
     this. cbService. alert ("ButtonDoesntExist");
    window. focus ();
   }
  }
 },

 observe: function (subject, topic, data)
 {
  if (topic == this. notificationPrefix + "updateImage")
  {
   if ((data == this. param. id) ||
    (data == this. tempId))
   {
    var array = subject. QueryInterface (Components. interfaces. nsISupportsArray);
    var contentType = array. GetElementAt (0). QueryInterface (Components. interfaces. nsISupportsString);
    var dataString = array. GetElementAt (1). QueryInterface (Components. interfaces. nsISupportsString);
    document. getElementById ("image"). value = "data:" + contentType. data + ";base64," + btoa (dataString. data);
   }
  }
  else if (topic == this. notificationPrefix + "setEditorParameters")
  {
   var param = subject. wrappedJSObject;
   if (this. param. id == param. id)
    this. setEditorParameters (subject);
  }
 },

 imageChanged: function ()
 {
  if (!this. param. id || !this. notificationPrefix)
   return;
  var image_input = document. getElementById ("image");
  var aURL = Components. classes ["@mozilla.org/supports-string;1"]. createInstance (Components. interfaces. nsISupportsString);
  aURL. data = image_input. value;
  var os = Components. classes ["@mozilla.org/observer-service;1"]. getService (Components. interfaces. nsIObserverService);
  os. notifyObservers (aURL, this. notificationPrefix + "updateIcon", this. param. id);
 },

 convert_image: function ()
 {
  var image_input = document. getElementById ("image");
  var aURL = image_input. value;
  if (aURL. indexOf ("custombuttons-stdicon") == 0)
  {
   aURL = window. getComputedStyle (image_input, null). getPropertyValue ("list-style-image");
   if (aURL. indexOf ("url(") == 0)
    aURL = aURL. substring (4, aURL. length - 1);
   else
    aURL = "";
  }
  this. cbService. convertImageToRawData (this. param. windowId, this. param. id || this. tempId, aURL);
 },

 destroy: function ()
 {
  var os = Components. classes ["@mozilla.org/observer-service;1"]. getService (Components. interfaces. nsIObserverService);
  os. removeObserver (this, this. notificationPrefix + "setEditorParameters");
  os. removeObserver (this, this. notificationPrefix + "updateImage");
 },

 onCancel: function ()
 {
  return this. canClose;
 }
};

var editor = new Editor ();