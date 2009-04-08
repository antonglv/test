#include <project.hjs>
#include <prio.hjs>

function Custombuttons () {}
Custombuttons. prototype =
{
	ps: SERVICE (PREF). getBranch ("custombuttons.button"),
	buttonParameters: ["name", "image", "code", "initCode", "accelkey", "help"],
	buttonsLoadedFromProfileOverlay: null,
	_palette: null,
	toolbarpaletteName: "BrowserToolbarPalette",
	shouldAddToPalette: true,
	cbService: null,
	
	get palette ()
	{
		if (!this. _palette)
			this. _palette = this. getPalette ();
		return this. _palette;
	},
	
	get gToolbox ()
	{
		return ELEMENT ("navigator-toolbox") || // FF3b2 and lower
			   ELEMENT ("browser-toolbox"); // see https://bugzilla.mozilla.org/show_bug.cgi?id=415099
	},
	
	getPalette: function ()
	{
		return this. gToolbox. palette;
	},
	
	pushMenuitem: function (sName, bPrimary)
	{
		var sId = "custombuttons-contextpopup-" + sName + (bPrimary? "": "-sub");
		var oMenuitem = ELEMENT (sId);
		oMenuitem. parentNode. appendChild (oMenuitem);
	},
	
	addObserver: function (sNotificationName)
	{
		var os = SERVICE (OBSERVER);
		os. addObserver (this, this. notificationPrefix + sNotificationName, false);
	},
	
	removeObserver: function (sNotificationName)
	{
		var os = SERVICE (OBSERVER);
		os. removeObserver (this, this. notificationPrefix + sNotificationName);
	},
	
	init: function ()
	{
		this. cbService = SERVICE (CB);
		this. cbService. register (window);
		var windowId = this. cbService. getWindowId (document. documentURI);
		this. notificationPrefix = this. cbService. getNotificationPrefix (windowId);
		this. pushMenuitem ("customize", true);
		this. pushMenuitem ("addnewbutton", true);
		this. pushMenuitem ("customize", false);
		this. pushMenuitem ("addnewbutton", false);
		this. pushMenuitem ("subCall", true);
		var pref = "settings.editor.showApplyButton";
		var ps = SERVICE (PREF);
		ps = ps. QI (nsIPrefBranch);
		var cbps = ps. getBranch ("custombuttons.");
		var mode = cbps. getIntPref ("mode");
		if (ps. prefHasUserValue (pref))
		{
			mode |= (ps. getBoolPref (pref)? CB_MODE_SHOW_APPLY_BUTTON: 0);
			try
			{
				ps. deleteBranch (pref);
			}
			catch (e) {}
		}
		cbps. setIntPref ("mode", mode);
		this. addObserver ("installButton");
		this. addObserver ("updateButton");
		this. addObserver ("cloneButton");
		this. addObserver ("removeButton");
	},
	
	close: function ()
	{
		this. cbService. unregister ();
		this. removeObserver ("removeButton");
		this. removeObserver ("cloneButton");
		this. removeObserver ("updateButton");
		this. removeObserver ("installButton");
		window. removeEventListener ("load", custombuttons, false);
		window. removeEventListener ("unload", custombuttons, false);
		window. removeEventListener ("keypress", custombuttons, true);
	},
	
	copyAttributes: function (oSrcButton, oDstButton)
	{
		var atts = oSrcButton. attributes;
		var attr;
		for (var i = 0; i < atts. length; i++)
		{
			attr = atts. item (i);
			oDstButton. setAttribute (attr. name, oSrcButton. getAttribute (attr. name));
		}
	},
	
	RemoveButtonFromPalette: function (oButton)
	{
		var sId = oButton. getAttribute ("id");
		var oPaletteButton = this. palette. getElementsByAttribute ("id", sId) [0];
		if (oPaletteButton)
			this. palette. removeChild (oPaletteButton);
	},
	
	AddButtonToPalette: function (oButton)
	{
		this. RemoveButtonFromPalette (oButton);
		var sId = "custombuttons-template-button";
		var oPaletteButton;
		var cbpb = this. palette. getElementsByAttribute ("id", sId) [0];
		if (cbpb)
			oPaletteButton = cbpb. cloneNode (true);
		else
			oPaletteButton = document. createElement (oButton. nodeName);
		this. copyAttributes (oButton, oPaletteButton);
		this. palette. appendChild (oPaletteButton);
	},
	
	persistCurrentSets: function (toolbarId, buttonId, newButtonId)
	{
		var toolbar = ELEMENT (toolbarId);
		//Исправляем currentSet для toolbar
		var repstr = "";
		if (newButtonId)
			repstr = buttonId + "," + newButtonId;
		var cs = toolbar. getAttribute ("currentset");
		var ar = cs. split (buttonId);
		cs = ar. slice (0, 2). join (repstr);
		if (ar. length > 2)
			cs = cs + ar. slice (2). join ("");
		cs = cs. replace (/^,/, "");
		cs = cs. replace (/,,/g, ",");
		cs = cs. replace (/,$/, "");
		toolbar. setAttribute ("currentset", cs);
		document. persist (toolbarId, "currentset");
		
		//если это custom-toolbar, то исправляем атрибуты в toolbarSet...
		var customindex = toolbar. getAttribute ("customindex");
		if (customindex > 0)
		{
			var attrName = "toolbar" + customindex;
			var toolbarSet = ELEMENT ("customToolbars");
			var oldSet = toolbarSet. getAttribute (attrName);
			cs = oldSet. substring (0, oldSet. indexOf (":") + 1) + cs;
			toolbarSet. setAttribute (attrName, cs);
			document. persist ("customToolbars", attrName);
		}
		//Исправления для AIOS
		if (ELEMENT ("aiostbx-belowtabs-toolbox"))
			persistCurrentSets ();
	},
	
	_cloneButton: function (oNewButton, sParentToolbarId, sClonedButtonId)
	{
		var oParentToolbar = ELEMENT (sParentToolbarId);
		var oClonedButton = oParentToolbar. getElementsByAttribute ("id", sClonedButtonId) [0];
		if (!oClonedButton)
			oClonedButton = ELEMENT (sClonedButtonId);
		if (!oClonedButton)
			return;
		var oClone = this. cbCloneNode (oNewButton);
		oClonedButton. parentNode. insertBefore (oClone, oClonedButton. nextSibling);
		if (this. shouldAddToPalette)
			this. AddButtonToPalette (oClone);
	},
	
	cloneButton: function (oClonedButton)
	{
		var sParentToolbarId = oClonedButton. parentNode. id;
		var sClonedButtonId = oClonedButton. getAttribute ("id");
		var sNewButtonId = this. cbService. cloneButton (oClonedButton);
		this. persistCurrentSets (sParentToolbarId, sClonedButtonId, sNewButtonId);
	},
	
	_removeButton: function (sParentToolbarId, sRemovedButtonId)
	{
		var cButtonsToRemove = document. getElementsByAttribute ("id", sRemovedButtonId);
		var bRemoveFromOverlay = (cButtonsToRemove. length == 1);
		var oParentToolbar = ELEMENT (sParentToolbarId);
		var oRemovedButton = oParentToolbar. getElementsByAttribute ("id", sRemovedButtonId) [0];
		if (!oRemovedButton)
			oRemovedButton = ELEMENT (sRemovedButtonId);
		if (!oRemovedButton)
			return;
		try
		{
			oRemovedButton. destroy ();
		}
		catch (oErr) {}
		if (bRemoveFromOverlay)
			this. RemoveButtonFromPalette (oRemovedButton);
		oRemovedButton. parentNode. removeChild (oRemovedButton);
	},
	
	removeButton: function (oRemovedButton)
	{
		var ps = SERVICE (PROMPT);
		var str = CB_STRING ("cbStrings", "RemoveConfirm", oRemovedButton. name);
		if (!ps. confirm (null, "Custom Buttons", str))
			return;
		var sParentToolbarId = oRemovedButton. parentNode. id;
		var sRemovedButtonId = oRemovedButton. getAttribute ("id");
		var cButtonsToRemove = document. getElementsByAttribute ("id", sRemovedButtonId);
		var bRemoveFromOverlay = (cButtonsToRemove. length == 1);
		this. cbService. removeButton (oRemovedButton, bRemoveFromOverlay);
		this. persistCurrentSets (sParentToolbarId, sRemovedButtonId, null);
	},
	
	cbCloneNode: function (node)
	{
		var oClone = document. createElement (node. nodeName);
		this. copyAttributes (node, oClone);
		return oClone;
	},
	
	// nsIObserver interface
	observe: function (oSubject, sTopic, sData)
	{
		var ta = sData. split (":");
		var topic = sTopic. replace (this. notificationPrefix, "");
		switch (topic)
		{
			case "removeButton":
				this. _removeButton (ta [0], ta [1]);
				break;
			case "cloneButton":
				this. _cloneButton (oSubject, ta [0], ta [1]);
				break;
			case "installButton":
			case "updateButton":
				var newButton, winButton;
				var sId = oSubject. getAttribute ("id");
				var winButtons = document. getElementsByAttribute ("id", sId);
				if (winButtons. length != 0)
				{
					for (var i = 0; i < winButtons. length; i++)
					{
						newButton = this. cbCloneNode (oSubject);
						winButton = winButtons [i];
						winButton. parentNode. replaceChild (newButton, winButton);
					}
				}
				newButton = this. cbCloneNode (oSubject);
				if ((topic != "updateButton") || this. shouldAddToPalette)
					this. AddButtonToPalette (newButton);
				break;
		}
	},
	
	addButton: function ()
	{
		this. openEditor ("");
	},
	
	editButton: function (oBtn)
	{
		var oButton = oBtn || document. popupNode || null;
		this. openEditor (oButton);
	},
	
	makeButtonLink: function (action, sButtonId)
	{
		return this. cbService. makeButtonLink (document. documentURI, action, sButtonId);
	},
	
	openEditor: function (oButton)
	{
		var link = this. makeButtonLink ("edit", oButton? oButton. id: "");
		this. cbService. editButton (window, link, null);
	},
	
	updateButton: function ()
	{
		var oButton = document. popupNode;
		if (!oButton)
			return;
		var sURI = this. cbService. readFromClipboard ();
		var link = this. makeButtonLink ("update", oButton. id);
		this. cbService. updateButton (link, sURI);
	},
	
	doButtonOperation: function (sOperation)
	{
		var oButton;
		oButton = document. popupNode;
		if (!oButton)
			return;
		switch (sOperation)
		{
			case "clone":
				this. cloneButton (oButton);
				break;
			case "remove":
				this. removeButton (oButton);
				break;
		}
	},
	
	copyURI: function ()
	{
        this. cbService. writeToClipboard (document. popupNode. URI);
	},
	
	getNumber: function (id)
	{
		if (id. indexOf ("custombuttons-button") != -1)
			return id. substring ("custombuttons-button". length);
		return "";
	},
	
	execute_oncommand_code: function (code, button)
	{
		custombutton. buttonCbExecuteCode ({}, button, code);
	},
	
	onKeyPress: function (event)
	{
		var cbd = SERVICE (CB_KEYMAP);
		var lenobj = {};
		var ids = cbd. Get (event, /*prefixedKey,*/ lenobj);
		if (ids. length == 0)
			return;
		var mode = (ids. shift () == "true");
		if (mode)
		{
			event. stopPropagation ();
			event. preventDefault ();
		}
		for (var i = 0; i < ids. length; i++)
		{
			try
			{
				ELEMENT (ids [i]). cbExecuteCode ();
			}
			catch (e) {}
		}
	},
	
	/* EventHandler interface */
	handleEvent: function (event)
	{
		switch (event. type)
		{
			case "load":
				this. init ();
				break;
			case "unload":
				this. close ();
				break;
			case "keypress":
				this. onKeyPress (event);
				break;
			default:
				break;
		}
	},
	
    /**  bookmarkButton(  )
      Author George Dunham
    
      Args:
      Returns: Nothing
      Scope:	 private
      Called:   from overlay.xul
      Purpose: Allows one to save a button as a bookmark
      UPDATED: 11/12/2007 to improve stability.
      changed by Anton 24.02.08
    **/
    bookmarkButton: function (oBtn)
    {
        var Button = (oBtn)? oBtn: document. popupNode;
        this. makeBookmark (Button. URI, Button. name);
    },
    
    makeBookmark: function (CbLink, sName)
    {
        BookmarksUtils. addBookmark (CbLink, sName);
    }
};

function CustombuttonsMF () {}
CustombuttonsMF. prototype =
{
    makeBookmark: function (CbLink, sName)
    {
		var uri = COMPONENT (SIMPLE_URI); // since there was 'bookmarkLink' execution problem
		uri. spec = CbLink;               // it seems nsIURI spec re-passing solves it
		PlacesCommandHook. bookmarkLink (PlacesUtils. bookmarksMenuFolderId, uri. spec, sName);
    }
};
EXTEND (CustombuttonsMF, Custombuttons);

function CustombuttonsST () {}
CustombuttonsST. prototype =
{
	shouldAddToPalette: false,
	
    makeBookmark: function (CbLink, sName)
    {
		var uri = COMPONENT (SIMPLE_URI); // since there was 'bookmarkLink' execution problem
		uri. spec = CbLink;               // it seems nsIURI spec re-passing solves it
		PlacesCommandHook. bookmarkLink (PlacesUtils. bookmarksMenuFolderId, uri. spec, sName);
    }
};
EXTEND (CustombuttonsST, Custombuttons);

function CustombuttonsTB () {}
CustombuttonsTB. prototype =
{
	toolbarpaletteName: "MailToolbarPalette",
	
	checkLightning: function ()
	{
		var result = false;
		var rs = SERVICE (RDF);
		var res = rs. GetResource ("urn:mozilla:item:{e2fda1a4-762b-4020-b5ad-a41df1933103}");
		if (res instanceof CI. nsIRDFResource)
		{
			var em = SERVICE (EXTENSION_MANAGER);
			var ds = em. datasource;
			var res2 = rs. GetResource ("http://www.mozilla.org/2004/em-rdf#isDisabled");
			var t = ds. GetTarget (res, res2, true);
			if (t instanceof CI. nsIRDFLiteral)
				result = (t. Value != "true");
		}
		return result;
	},
	
	lightning: false,
	
	init: function ()
	{
		SUPER (init, null);
		var oBookmarkButtonMenuitem = ELEMENT ("custombuttons-contextpopup-bookmarkButton");
		oBookmarkButtonMenuitem. parentNode. removeChild (oBookmarkButtonMenuitem);
		var oBookmarkButtonMenuitem = ELEMENT ("custombuttons-contextpopup-bookmarkButton-sub");
		oBookmarkButtonMenuitem. parentNode. removeChild (oBookmarkButtonMenuitem);
		this. lightning = this. checkLightning ();
	},
	
	get gToolbox ()
	{
		return ELEMENT ("mail-toolbox") || // main window and message window
			   ELEMENT ("compose-toolbox"); // compose message
	},
	
	openEditor: function (oButton)
	{
		var mode = "";
		var param;
		if (this. lightning)
		{
			var mode = window ["gCurrentMode"];
			var mb = ELEMENT ("modeBroadcaster");
			mode = mode || (mb? mb. getAttribute ("mode"): "");
			if (document. popupNode && (document. popupNode. nodeName == "toolbar"))
			{
				if (document. popupNode. id == "mode-toolbar")
					mode = "mode";
				else if (document. popupNode. id == "calendar-toolbar")
					mode = "calendar";
				else if (document. popupNode. id == "task-toolbar")
					mode = "task";
			}
		}
		if (mode)
		{
			param = {};
			param ["attributes"] = {};
			param. attributes ["mode"] = mode;
			param. wrappedJSObject = param;
		}
		var link = this. makeButtonLink ("edit", oButton? oButton. id: "");
		this. cbService. editButton (window, link, param);
	},

    makeBookmark: function (CbLink, sName) {}
};
EXTENDS (CustombuttonsTB, Custombuttons);

function CustombuttonsTBMW () {}
CustombuttonsTBMW. prototype =
{
	toolbarpaletteName: "MailToolbarPalette"
};
EXTEND (CustombuttonsTBMW, CustombuttonsTB);

function CustombuttonsTBMC () {}
CustombuttonsTBMC. prototype =
{
	toolbarpaletteName: "MsgComposeToolbarPalette"
};
EXTEND (CustombuttonsTBMC, CustombuttonsTB);

function CustombuttonsSB () {}
CustombuttonsSB. prototype =
{
	toolbarpaletteName: "calendarToolbarPalette",
	shouldAddToPalette: true,
	
	get gToolbox ()
	{
		return ELEMENT ("calendar-toolbox"); // calendar
	},
    
    makeBookmark: function (CbLink, sName) {}
};
EXTEND (CustombuttonsSB, CustombuttonsTB);

const custombuttons = new custombuttonsFactory (). Custombuttons;

// add-ons
/**  uChelpButton(  )
  Author Yan, George Dunham

  Args:
  Returns: Nothing
  Scope:	 private
  Called:	 By:
     1. Custom buttons context menu.
  Purpose: To:
     1. Display the button's help text.
     2. Insert the help data into the clipboard.
     TODO: Provide a means to display help in the form of
           web page.
     Add
     changed by Anton 24.02.08
     TODO: refactor it
	 UPDATED: 16.03.08 by Anton - uChelpButton should not use global clipboard
	 UPDATED: 03.04.08 by Anton - now we have 'name' field in buttons
**/
custombuttons.uChelpButton = function ( oBtn ) //{{{
{
  // UPDATED: 11/8/2007 to accept oBtn as an arg.
  var Button = ( oBtn )? oBtn : document.popupNode;
  var bId = this.getNumber(Button.id); // <---
  var str = Button.getAttribute( "Help" ).split( "[,]" )[0] || Button.getAttribute( "help" ).split( "," )[1];

  var hlpTitle = CB_STRING ("cbStrings", "ButtonHelpTitle", Button. name);
  hlpTitle = hlpTitle. replace (/%y/gi, bId);
  var hlp = createMsg(hlpTitle);
  str = str. replace (/\<label\>/gi, Button. name). replace (/\<id\>/gi, bId);
  hlp. aMsg (str);
}; //}}} End Method uChelpButton(  )

// Custombuttons utils
const custombuttonsUtils =
{
	addMethodGate: function (srcObject, sMethodName, dstObject)
	{
		dstObject [sMethodName] = function ()
		{
			return function ()
			{
				return srcObject [sMethodName]. apply (srcObject, arguments);
			}
		} ();
	},

    /**  createMsg( [title] )
 Author:	George Dunham aka: SCClockDr

 Scope:		global
 Args:		title - Optional Title to init the object with.
 Returns:	Msg
 Called by:	1. Any process wanting to instance this message object.
 Purpose: 	1. Create a message object and return it to the caller process.
 How it works:	gMsg uses the constructor method to create an object gMsg
 Setup:		MyObj = new gMsg();
 Use:		MyObj.aMsg("Any string", ["Optional Title"]);
 changed by Anton 24.02.08
 TODO: refactor it
**/
createMsg: function (title) //{{{
{
  /**  Object Msg
   Author:	George Dunham aka: SCClockDr

   Scope:		Public
   Properties:	prompts - nsIPromptService
      check - Provides a check box if value = true.
      sTitle - Retains the default/assigned title for the
         Dialog box.
   Methods:	aMsg - Displays the dialog box.
   Purpose:	1. Provide a better means to alert the operator.
  **/
  var Msg = { //{{{
    // Properties:
    prompts: SERVICE (PROMPT),
    check:{value: false},
    sTitle:"Custom Buttons",
    button:false,
    // Methods
    /**  aMsg( str, [title] )

     Scope:		global
     Args:		str - String to display
        title - Optional title of the dialog
     Returns:	Nothing
     Called by:	1. Any process which has the aMsg object
           available
     Purpose: 	1. Present a confirm dialog.
    **/
    aMsg:function ( str, title ) //{{{
    {
      if (typeof title == "string"){this.sTitle = title}
      var flags = this.prompts.BUTTON_POS_0 * this.prompts.BUTTON_TITLE_IS_STRING;
      var button = this.prompts.confirmEx(null, this.sTitle, str, flags, GET_STRING ("cbStrings", "ContinueButton"), "", "", "", this.check);
    }  //}}} End Method aMsg( str, [title] )


  }; //}}} End Object Msg
  if (typeof title == "string"){Msg.sTitle = title}
  return Msg;
}, //}}} End createMsg( [title] )

get ps ()
{
    return SERVICE (PREF);
},

/*--------------------------- Preference Utilities ---------------------------*/

/**  isPref( sPrefId, aDefault )
  Author	 George Dunham

  Args:	 aprefId - Preference ID string
     aDefault - Default Preference Value
  Returns: lRet - Boolean, true if the preference exists.
  Scope:	 public
  Called:	 By:
     1. Any process which passes aprefId and will accept
        a boolean return.
     2. Passing the optional [Default] will cause the pref
        to be created if not defined.
  Purpose: To:
     1. Test for the presence of a specified pref.
     NOTE: Inserted with ver. 2.0.02a
**/
isPref: function ( sPrefId, aDefault ) //{{{
{
  try{
    var lRet = (this.getPrefs( sPrefId ) !== null	); // UPDATED: 11/29/2007
    if ( typeof aDefault != "undefined" && !lRet ) {
      this.setPrefs( sPrefId, aDefault )
      lRet = true;
    } // End if ( typeof aDefault != CB2const.VOID && !rRet )
  }
  catch(e) {
    alert([sPrefId, aDefault, e, e.stack]);
  }
  return lRet;
}, //}}} End Method isPref( sPrefId, aDefault )
/**  getPrefs( sPrefId )
  Author	 George Dunham

  Args:	 sPrefId - Preference ID string
  Returns: rRet - Preference value in the correct type.
     1. null if Preference ID not in about:config list.
  Scope:	 public
  Called:	 By:
     1. Any process passing a prefid string and accepting
        its value.
  Purpose: To:
     1. Return the pref specified in sPrefId
     NOTE: Inserted with ver. 2.0.02a
**/
getPrefs: function ( sPrefId ) //{{{
{
  var rRet = null;
  var nsIPrefBranchObj = this.ps.getBranch( null );
  switch ( nsIPrefBranchObj.getPrefType( sPrefId ) ){
  case 32:						// string
    rRet = nsIPrefBranchObj.getCharPref( sPrefId );
    break;
  case 64:						// number
    rRet = nsIPrefBranchObj.getIntPref( sPrefId );
    break;
  case 128:						//  boolean
    rRet = nsIPrefBranchObj.getBoolPref( sPrefId );
    break;
  default:
    rRet = null;
  }
  return rRet;
}, //}}} End Method getPrefs( sPrefId )
/**  setPrefs( sPrefId, prefValue )
  Author	 George Dunham

  Args:	 sPrefId - Preference ID string
     prefValue - Value to set into the Preference ID.
  Returns: Nothing
  Scope:	 public
  Called by:
     1. Any process which passes a pref id and it's new value.
  Purpose: To:
     1. Modify the specified pref to the passed value.
     NOTE: Inserted with ver. 2.0.02a
**/
setPrefs: function ( sPrefId, prefValue ) //{{{
{
  var nsIPrefBranchObj = this.ps.getBranch(null);
  switch (typeof prefValue){
  case "undefined":
    break;
  case "string":
    nsIPrefBranchObj.setCharPref( sPrefId, prefValue );
    this.ps.savePrefFile( null );
    break;
  case "number":
    nsIPrefBranchObj.setIntPref( sPrefId, prefValue );
    this.ps.savePrefFile( null );
    break;
  case "boolean":
    nsIPrefBranchObj.setBoolPref( sPrefId, prefValue );
    this.ps.savePrefFile( null );
    break;
  default:
  }
}, //}}} End Method setPrefs( sPrefId, prefValue )

/**  clearPrefs( sPrefId )
 Author:    George Dunham aka: SCClockDr
 Scope:	    global
 Args:	    sPrefId - Preference ID string

 Returns:   Nothing
 Called by: 1.
 Purpose:   1. Clear specified User preference
 changed by Anton 25.02.08
 */
 clearPrefs: function(sPrefId) //{{{
{
  var nsIPrefBranchObj = this.ps.getBranch(null);
  nsIPrefBranchObj.clearUserPref(sPrefId);
  this.ps.savePrefFile( null );
}, //}}} End Method clearPrefs( sPrefId )

/**  readFile( fPath )
 Author:    George Dunham aka: SCClockDr
 Scope:	    private
 Args:	    fPath -
 Returns:   sRet
 Called by: 1.
 Purpose:   1.
 TODO:	    1.
 changed by Anton 25.02.08
 */
 readFile: function(fPath) //{{{
{
  var sRet = null;
  var file = null;
  fPath = (fPath.indexOf(':\\') > -1 )? fPath.replace(/\//g,'\\') : fPath;
  try {
    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
  } catch (e) {
    alert("Permission to read file was denied.");
  }
  file = COMPONENT (LOCAL_FILE);
  file.initWithPath( fPath );
  var fis = COMPONENT (FILE_INPUT_STREAM);
  fis.init( file,0x01, 00004, null);
  var sis = COMPONENT (SCRIPTABLE_INPUT_STREAM);
  sis.init( fis );
  sRet = sis.read( sis.available() );
  return sRet;
}, //}}} End Method readFile( fPath )

/**  writeFile( fPath, sData )
 Author:    George Dunham aka: SCClockDr
 Scope:	    private
 Args:	    fPath -
            sData -
 Returns:   Nothing
 Called by: 1.
 Purpose:   1.
 TODO:	    1.
 */
 writeFile: function(fPath, sData) //{{{
{
  try{
    fPath = (fPath.indexOf(':\\') > -1 )? fPath.replace(/\//g,'\\') : fPath;
    var file = COMPONENT (LOCAL_FILE);
    file.QueryInterface(Components.interfaces.nsIFile);
    file.initWithPath( fPath );
    if( file.exists() == true ) file.remove( false );
    var strm = COMPONENT (FILE_OUTPUT_STREAM);
    strm.QueryInterface(Components.interfaces.nsIOutputStream);
    strm.QueryInterface(Components.interfaces.nsISeekableStream);
    strm.init( file, 0x04 | 0x08, 420, 0 );
    strm.write( sData, sData.length );
    strm.flush();
    strm.close();
  }catch(ex){
    window.alert(ex.message+'nnn');
  }
},

	gClipboard:
	{
		_cbService: SERVICE (CB),
		_cbClipboard: [],
		
		Write: function (str)
		{
			this. _cbClipboard [0] = str;
		},
		
		Clear: function ()
		{
			this. Write ("");
		},
		
		Read: function ()
		{
			return this. _cbClipboard [0] || "";
		},
		
		write: function (str)
		{
			this. _cbService. writeToClipboard (str);
		},
		
		clear: function ()
		{
			this. write ("");
		},
		
		read: function ()
		{
			return this. _cbService. readFromClipboard ();
		}
	}
}; // -- custombuttonsUtils

// Custombuttons API

const createMsg = custombuttonsUtils. createMsg;
const gClipboard = custombuttonsUtils. gClipboard;

custombuttonsUtils. addMethodGate (custombuttonsUtils, "isPref", custombuttons);
custombuttonsUtils. addMethodGate (custombuttonsUtils, "getPrefs", custombuttons);
custombuttonsUtils. addMethodGate (custombuttonsUtils, "setPrefs", custombuttons);
custombuttonsUtils. addMethodGate (custombuttonsUtils, "clearPrefs", custombuttons);
custombuttonsUtils. addMethodGate (custombuttonsUtils, "readFile", custombuttons);
custombuttonsUtils. addMethodGate (custombuttonsUtils, "writeFile", custombuttons);

window. addEventListener ("load", custombuttons, false);
window. addEventListener ("unload", custombuttons, false);
window. addEventListener ("keypress", custombuttons, true);
