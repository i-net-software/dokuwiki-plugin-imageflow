#ImageFlow - a flowing Gallery

ImageFlow is originally based up on [Finn Rudolph's](http://imageflow.finnrudolph.de) implementation of the elegant Apple-like CoverFlow gallery. It has been rewritten in 2010-01 anbd again for jQuery in 2014-02. It only shares the core calculations with the original. The current version also supports multiple flow components in one page and comes absolutely free.

You can either give a namespace and display all the images, or you can define a list of images that will be shown (see the options). If you defined some meta-data for your images (currently supported: ``IPTC.title`` and ``IPTC.caption`` - these can be defined in the media manager) ImageFlow will display them below the scroll bar.

##Features
 * CoverFlow Gallery from namespaces and single images
 * enable / disable reflections, [created by iReflect](https://github.com/i-net-software/dokuwiki-plugin-reflect)
 * click- and draggable scroll bar
 * mouse wheel support
 * images can be clicked to pop out (needs the [PopUp Viewer](https://github.com/i-net-software/dokuwiki-plugin-popupviewer) plugin)
 * fallback image implementation - meaning: when an image is not being loaded within a certain time frame - ant alternative iamge is being displayed until the image has been loaded.
 * plugin can be used for custom implementations (if you would like to know how that works, please contact our support)

##Syntax

```
<imageflow %NAMESPACE%></imageflow>

or:

<imageflow>
<image %IMAGE%[?width=%WIDTH%&linkto=%LINKTO%]>%DESCRIPTION%</image>
</imageflow>
```

Option|Description
------|-----------
__``%NAMESPACE%``__|If this is given, the following won't matter. The plugin then reads all images from the given namespace and builds the flow-scroller
__``%IMAGE%``__|an Image as you know it from DokuWiki - but it does not yet support any known options
__``%WIDTH%``__ (optional)|Width in px. The only option that should be given, so that DokuWiki will return smaller Images and the browser won't have to load and re-render all the images at this point. The recommended width is “200”
__``%LINKTO%``__(optional)| Here you can set a wiki page. If this is given, the user will be redirected to the wiki page, instead of getting a popup when clicking the image.
__``%DESCRIPTION%``__ (optional)|You can give an alternate description here, to display some description if no IPTC Caption meta-data is set

You can use your images names or page names as anchors. This will directly pop out the item after the imageflow loaded.

##Customizing the Styles

ImageFlow has a predefined set of colors. If you want to change them to your needs, you can either do so in your template or use the file conf/userstyle.css. The following table shows the css selector and the properties that can be changed.

Selector|What is it?|Property / Default Value
--------|-----------|------------------------
``div.imageflow_wrapper.scripting_active``|Background Color of the viewport when javascript is enabled|``background-color: __darker__ !important``
``div.imageflow_caption``|Text Color of the Captions|``color: #fff``