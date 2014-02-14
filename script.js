(function($)
{
	var imageflow_plugin = function(root) {
		
		var _self = this;
		
		this.root = $(root);
		
		this.widthfactor = 0.51;
		this.reflectionHeight = 0.5;
		this.bottomLine = this.root.width() * 0.33; // Or false 
	
		this.imagesroot = null;
		this.checkedImages = new Array();
		this.imageflowDone = false;
	
		this.current = 0;
		this.xstep = 150; // pixel to move;
		this.xstepWidthScaleFactor = 0.80; // scale the width of the images  
		this.xstepHeightScaleFactor = 0.60; // scale the height of the images  
		this.focusedElememtsPerSide = 5;
	
		this.maxheight = this.root.width() * this.widthfactor;
		this.timeOutAction = null;
		this.whereToMoveQueue = new Array();
	
		this.images = null;
		this.caption = null;
	
		// Loader
		this.loadingbar = null;
		this.loadingbartext = null;
		this.loadingbarloader = null;
		
		// Scroller
		this.scrollbar = null;
		this.scrollbarwidth = this.root.width() * 0.6;
		this.scrollbarSliderOffsetLeft = 38; 
		this.scrollbarSliderOffsetRight = 54;
		this.scroller = null;
		
		this.dragStartPosition = false;
		this.scrollerStartDragOffset = false;
		this.scrollerDragOffset = 0;
		this.scrollerIsDragging = false;
		this.scrollerDownIntervall = false;
		this.mouseDownByDrag = false;
		
		this.intermediateImageSrc = DOKU_BASE + 'lib/plugins/imageflow/images/intermediate.png';
		
		this.debug = false;
		
		this.buildBasicStructure = function() {
			
			if ( this.loadingbar !== null || this.images !== null ) { return false; }
			
			var arVersion = navigator.appVersion.split("MSIE");
			var version = parseFloat(arVersion[1]);
	
			var newRoot = $('<div/>').addClass('imageflow_root').appendTo(this.root);
			
			// Start Build Loader
			this.loadingbar = $('<div/>')
								.addClass('imageflow_loadingbar_container')
								.css({top: (this.root.height()/2 -8), left: (this.root.width()/2 -100)}).appendTo(newRoot);
								
			
			this.loadingbarloader = $('<div/>').addClass('imageflow_loader').appendTo(this.loadingbar);
			this.loadingbartext = $('<p/>').text('Loading in progress.').appendTo(this.loadingbarloader);
			// End Build Loader
	
			// Start Build Images Container
			this.images = $('<div/>').addClass('imageflow_images').height(this.root.width()*0.338).appendTo(newRoot);
			// End Build Images Container
	
			var splitter = $('<div/>').addClass('imageflow_no_scroller').appendTo(newRoot);
			
			// Start Build Scroller Container
			this.scrollbar = $('<div/>').addClass('imageflow_scrollbar').width(this.scrollbarwidth).css({left:((this.root.width() - (this.scrollbarwidth + this.scrollbarSliderOffsetLeft + this.scrollbarSliderOffsetRight)) / 2), 'margin-top': this.root.width() * 0.02 + 30}).click(_self.scrollerClick).appendTo(newRoot);
	
			/* Set slider attributes */
			/* Mousedown instead of click for holding it there */
			$('<div/>').addClass('imageflow_slider_cap_left').appendTo(this.scrollbar).bind('mousedown', { direction: -1 }, _self.scrollerSideDown);
			this.scroller = $('<div/>').addClass('imageflow_slider').appendTo(this.scrollbar).bind('mousedown', _self.dragStart);
			$('<div/>').addClass('imageflow_slider_cap_right').appendTo(this.scrollbar).bind('mousedown', { direction: 1 }, _self.scrollerSideDown);
			
			$(document).bind('mouseup', _self.scrollerSideUp);
			// End Build Scroller Container
			
			// Start Build Caption Container
			this.caption = $('<div/>').addClass('imageflow_caption').width(this.root.width() * 0.5).css({left:this.root.width() * 0.25}).appendTo(newRoot);
			// End Build Caption Container
		};
		
		this.dbgMessage = function(message) {
			if ( _self.debug ) {
				console.log(message);
			}
		};
		
		this.loadImageEvent = function (src, eventFkt) {
			var loadImage = new Image();
			loadImage.bind('load', eventFkt);
			loadImage.src = src;
		};
		
		// Set Timeout for clusores
		this.timeOut = function(fkt, time) {
			setTimeout(function(e) {
				_self[fkt](e, this);
			}, time);
		};
		
		this.init = function() {
			
			this.root.addClass('scripting_active').html("").height(this.maxheight + 20);
			this.buildBasicStructure();
			
			// Loader Image Cascade
			// Prepare Loader images - they have to be shown very first.
			var loadImage = $(new Image());
			loadImage.bind('load', function() {
	
				_self.loadingbar.show(); // Show loader Bar
				var loadImage = $(new Image());
				loadImage.bind('load', function() {
					_self.timeOut('initImages', 500);
				});
				
				loadImage.attr('src', DOKU_BASE + 'lib/plugins/imageflow/images/loader_bg.gif');
			});
			
			loadImage.attr('src', DOKU_BASE + 'lib/plugins/imageflow/images/loader.gif');
			
			var intermediate = new Image();
			intermediate.src = this.intermediateImageSrc;
		};
		
		this.initImages = function () {
			
			// get images from JSINFO var
			$(JSINFO['relation']['imageflow'][this.root.attr('id')]).each(function(){
				var imgRep = new imageRepresentation();
				imgRep.init(this);
				_self.checkedImages.push(imgRep);
			});
			
			this.timeOut('checkForImagesReady', 50);
		};
		
		/*
		 * END OF ALL INIT THINGS
		 */
		
		
		/*
		 * Represents an image with special functions inside
		 */
		var imageRepresentation = function() {
			
			var __self = this;
			
			this.imgData = null;
			this.image = null;
			this.id = null;
			
			this.counter = 300;
			this.isFinished = false;
			
			this.x_pos = 0;
			this.width = 0;
			this.height = 0;
			this.pc = 0;
			
			this.isImageOk = function() {
				
				var img = this.image.get(0);
				if (!img.complete) { return false; }
				if (typeof img.naturalWidth != "undefined" && img.naturalWidth == 0) { return false; }
	
				// No Way to determine
				return true;
			};
			
			this.intermediateFinish = function() {
				
				this.counter = 10;
				this.imgData.intermediateImage = this.image;
				this.image = $(new Image());
	
				this.imgData.intermediateImage.bind('load', function() {
	
					// reset the image
					__self.image.replaceWith(__self.imgData.intermediateImage);
					__self.image = __self.imgData.intermediateImage;
					__self.finish();
					
					_self.moveTo(_self.current); // Force repaint
				});
				
				this.image.bind('load', __self.finish);
				this.image.attr('src', _self.intermediateImageSrc);
			};
			
			this.finish = function() {
				
				__self.counter = 0; 
				__self.width = __self.image.naturalWidth();
				__self.height = __self.image.naturalHeight(); // - ( this.image.height * this.reflectionHeight ); // Height w/o reflection
	
				/* Check source image format. Get image height minus reflection height! */
				__self.pc = _self.xstep * (((__self.width + 1) > (__self.height / (_self.reflectionHeight + 1))) ? _self.xstepWidthScaleFactor : _self.xstepHeightScaleFactor);
			};
			
			this.checkFinished = function() {
				var isOK = this.isImageOk();
				if ( !isOK && this.counter > 0 ) {
					this.counter--;
					return false;
				} else if ( !isOK && this.counter == 0) {
					this.intermediateFinish();
				}
				
				this.isFinished = true;
				this.finish();
				return true;
			};
			
			this.init = function(imgData) {
				
				this.imgData = imgData;
				this.imgData.isImage = true;
				
				this.image = $(new Image());
				var src = this.imgData.src;
				if ( imgData.params ) {
					for ( var key in imgData.params) {
						if ( typeof key == 'string' && (typeof imgData.params[key] == 'string' || typeof imgData.params[key] == 'number') ) {
							src += (src.indexOf('?') > 0 ? '&' : '?') + escape(key) + "=" + escape(imgData.params[key]);
						}
					}
				}
				
				this.image.attr({
					src: src,
					id: this.imgData.id
				}).hide();
				
				this.id = this.imgData.id;
	
				this.image.bind('load', __self.finish);
			}
		};	
		
		this.loadingStatus = function() {
			
			var completed = 0; var total = 0;
			
			for ( var img = 0; img < this.checkedImages.length; img++ ) {
				if ( this.checkedImages[img].isFinished || this.checkedImages[img].checkFinished() ) { completed++; }
				total ++;
			}
	
			var finished = Math.round((completed/total)*100);
			if ( finished >= 100 ) { finished = 100; }
			
			this.loadingbarloader.width(finished+'%');
			this.loadingbar.show();
	
			this.loadingbartext.text('Loading Images ' + completed + '/' + total);
	
			return finished;
		};
		
		this.checkForImagesReady = function() {
			
			if ( this.imageflowDone ) { return; }
			if ( this.loadingStatus() < 100 ) {
				this.timeOut('checkForImagesReady', 50);
				return;
			} else {
				this.imageflowDone = true;
			}
			
			this.refreshImageFlow();
			this.addGlobalEvents();
			this.checkForPopUp();
		};
		
		this.addGlobalEvents = function () {

			this.root.bind({
				'mousewheel': _self.globalEvent,
				'mousemove': _self.drag
			});

			$(document).bind({
				'keydown': _self.globalEvent,
				'mouseup': _self.dragStop
			});
		};
		
		/*
		 * BEGINN OF ALL MOVEMENT THINGS
		 */
		this.refreshImageFlow = function() {
			
			var img = 0;
			for ( img; img < this.checkedImages.length; img++ ) {
				var imageElement = this.checkedImages[img];
	
				this.images.append(imageElement.image);
	
				imageElement.image.show();
				imageElement.image.css('cursor', 'pointer');
	
				imageElement.image.click(_self.elementClick);
				imageElement.image.dblclick(_self.specialClick);
				imageElement.image.bind('mousedown', _self.dragStart);
			}
	
			if ( img <= 1 ) {
				this.loadingbartext.text('Ups. There are no Images.');
				this.loadingbartext.css('color', "#a00");
				
				return;
			}
			
			this.loadingbar.hide();
			this.scrollbar.show();
			this.moveTo(this.current, this.current);
			this.glideTo(this.current);
		};
		
		this.moveTo = function(whereToMove, origWhereToMoveIndex) {
			
			//this.current = whereToMove;
			var zIndex = _self.checkedImages.length;
			var size = _self.root.width() * 0.5;
			var images_top = 50; // Offset from top
			
			for ( var img = 0; img < _self.checkedImages.length; img++ ) {
				var imageElement = _self.checkedImages[img];
				
				// Hide Elements outside of our viewport
				if ( img < _self.current - _self.focusedElememtsPerSide || img > _self.current + _self.focusedElememtsPerSide ) {
					imageElement.image.hide();
					continue;
				}
				
				var movement = (img - _self.current) * _self.xstep;
				var z = Math.sqrt(10000 + movement * movement) + 100;
				var xs = movement / z * size + size;
	
				/* Still hide images until they are processed, but set display style to block */
				imageElement.image.show();
				
				/* Process new image height and image width */
				var new_img_h = (imageElement.height / imageElement.width * imageElement.pc) / z * size;
				var new_img_w = imageElement.pc / z * size;
				
				if ( new_img_h > _self.maxheight ) {
					new_img_h = _self.maxheight;
					new_img_w = imageElement.width * new_img_h / imageElement.height;
				}
				
				var new_img_top = ((new_img_h / (_self.reflectionHeight + 1)) * _self.reflectionHeight);
				if ( _self.bottomLine !== false ) { new_img_top += (_self.bottomLine - new_img_h); }
				
				var new_img_left = xs - (imageElement.pc / 2) / z * size;
				
				imageElement.image.css({left: new_img_left, top: new_img_top }).width(new_img_w).height(new_img_h);
				
				_self.dbgMessage(imageElement.image.offset().left + "|" + imageElement.image.offset().top + " " + imageElement.image.width() + "x" + imageElement.image.height());
				
				// imageElement.image.style.visibility = 'visible';
				
				/* Set image layer through zIndex */
				if ((img - _self.current) < 0) {
					zIndex++;
				} else {
					zIndex--;
				}
				
				// register new handles
				if ( img == origWhereToMoveIndex ) {
					zIndex++;
	
					imageElement.image.unbind('click').click(_self.specialClick);
				} else {
					imageElement.image.unbind('click').click(_self.elementClick);
				}
				
				imageElement.image.css('z-index', zIndex);
			}
			
			_self.current = whereToMove;
			
			// Set Caption, though its not performaing best here
			if (_self.checkedImages[origWhereToMoveIndex]) { _self.buildCaptionForElement(_self.checkedImages[origWhereToMoveIndex].imgData); }
			_self.setSliderPosition();
		};
		
		this.buildCaptionForElement = function(imgData) {
	
			// Remove old Caption
			this.caption.html('');
	
			// Create new Caption if title or caption given
			if ( imgData.title ) {
				this.caption.append($('<h3/>').text(imgData.title));
			}
			
			if ( imgData.desc ) {
				this.caption.append($('<p/>').text(imgData.desc));
			}
		};
		
		this.setSliderPosition = function(override) {
			var new_slider_pos = (_self.scrollbarwidth * (_self.current/(_self.checkedImages.length-1)));
			if ( new_slider_pos >= 0 &&  new_slider_pos <= _self.scrollbarwidth && ( _self.scrollerStartDragOffset === false || override === true ) ) {
				_self.dbgMessage('slider-margin-left:' + (new_slider_pos - (_self.scroller.width() / 2)));
				_self.scroller.css('margin-left', new_slider_pos - (_self.scroller.width() / 2));
			}
		};
		
		this.glideTo = function(whereToMove) {
	
			if ( whereToMove < 0 ) { whereToMove = 0; }
			if ( whereToMove >= _self.checkedImages.length ) { whereToMove = _self.checkedImages.length-1; }
			
			// Animate gliding to new position
			// If current position is not the desired one
			var devident = (_self.whereToMoveQueue.length > 1 ? 1 : _self.xstep); // check distance
			if ( whereToMove < _self.current - 1/devident || whereToMove > _self.current + 1/devident ) 
			{
				_self.moveTo(_self.current + (whereToMove-_self.current)/3, whereToMove); // move in three steps
				_self.timeOutAction = setTimeout(function(){ _self.glideTo(whereToMove) }, 50);
				return;
			}
			
			_self.current = whereToMove;
	
			if ( _self.whereToMoveQueue.length > 1 ) { // Asume, the first entry is the first moving step
				_self.timeOutAction = setTimeout(function() {
					_self.glideTo(parseInt(_self.whereToMoveQueue.splice(1,1))); }, 50);
			} else {
	
				// Display new caption
				_self.moveTo(_self.current, _self.current); // If the above got interrupted, set the new distance
	
				_self.timeOutAction = null; // Reset Timeout
				_self.whereToMoveQueue = new Array();
			}
		};
		
		this.addMoveElementToQueue = function (whereToMove) {
			if ( whereToMove < 0 ) { whereToMove = 0; } // Already the first
			if ( whereToMove >= _self.checkedImages.length ) { whereToMove = _self.checkedImages.length-1; } // This is already the last
	
			_self.whereToMoveQueue.push(whereToMove);
			_self.glideTo(whereToMove);
	
			return true;
		};
		
		this.handle = function(delta) {
	
			var whereToMove = _self.current;
			if ( _self.timeOutAction ) {
				clearTimeout(this.timeOutAction);
				_self.timeOutAction = null;
				whereToMove = parseInt(_self.whereToMoveQueue[_self.whereToMoveQueue.length - 1]);
				_self.whereToMoveQueue = new Array();
			}
			
			whereToMove += delta;
			if ( _self.addMoveElementToQueue(whereToMove) ) { return whereToMove; }
		};
		
		this.drag = function(e) {
		
			if ( !_self.dragStartPosition ) { return; } // Dragging not inited
			e.stopPropagation();
	
			var direction = _self.scrollerIsDragging ? 1 : -1;
			var posx = e.clientX;
			var move =  direction * (posx - _self.dragStartPosition);
	
			if ( !_self.scrollerIsDragging ) { // Dragging at the image
	
				_self.dbgMessage("dragging image");
				
				if ( _self.scrollerStartDragOffset === false || isNaN(_self.scrollerStartDragOffset.target) || isNaN(_self.scrollerStartDragOffset.current) ) {
					_self.scrollerStartDragOffset = {};
					_self.scrollerStartDragOffset.target = _self.getClickImage(e);
					_self.scrollerStartDragOffset.current = _self.current;
					
					_self.dbgMessage("setting StartDragOffset (" + _self.scrollerStartDragOffset.target + " / " + _self.scrollerStartDragOffset.current + ")");
				}
				
				var s = _self.images.width()/2;
				var movement = (_self.scrollerStartDragOffset.target - _self.scrollerStartDragOffset.current) * _self.xstep;
				var z = Math.sqrt(10000 + movement * movement) + 100;
				var xs = movement / z * s;
	
				_self.dbgMessage("move1: " + move);
				move += direction * (xs);
				_self.dbgMessage("move2: " + move);
				
				xs = move + s;
				if ( xs < 0 ) { xs = 0; }
				if ( xs > 2*s ) { xs = 2*s - 1; }
				movement = (200 * s * ( xs -s ) / ( (2*s - xs) * xs )) / _self.xstep;
				_self.dbgMessage("movement1: " + movement);
				_self.dbgMessage("xs: " + xs);
	
				// Maximum movement to either side
				if ( movement > _self.focusedElememtsPerSide ) { movement = _self.focusedElememtsPerSide; } 
				if ( movement < -_self.focusedElememtsPerSide ) { movement = -_self.focusedElememtsPerSide; }
				
				movement += _self.scrollerStartDragOffset.current + (_self.scrollerStartDragOffset.target - _self.scrollerStartDragOffset.current);
				
				_self.dbgMessage("movement2: " + movement);
				_self.moveTo(movement, Math.round(movement));
				_self.mouseDownByDrag = true;
	
				
				// // this.debug.innerHTML = movement + " " + this.current;
				
			} else {
				_self.dbgMessage("dragging scroller");
	
				var deltaPercent = move * 100 / _self.scrollbarwidth;
				var delta = Math.round(_self.checkedImages.length / 100 * deltaPercent);

				if (_self.scrollerDragOffset - delta != 0) {
					_self.handle(delta - _self.scrollerDragOffset);
					_self.scrollerDragOffset = delta;
				}
			}
	
			_self.setSliderPosition(true);
	
			return false;
		};
	
		this.dragStart = function(e) {
	
			if ( _self.timeOutAction !== null ) { return; }

			_self.dbgMessage("Drag Start " + e.target);
			e.stopPropagation();
			
			_self.dragStartPosition = e.clientX;
			_self.scrollerIsDragging = e.target == _self.scroller.get(0);
			_self.scrollerStartDragOffset = _self.scrollerIsDragging ? _self.scroller.offset().left : false;
		};
		
		this.dragStop = function(e) {
			
			if ( _self.dragStartPosition === false ) { return; } 
	
			e.stopPropagation();

			_self.dbgMessage("Drag Stop " + e.target);
			if ( _self.scrollerIsDragging === false && typeof _self.scrollerStartDragOffset == 'object' && isFinite(parseInt(_self.scrollerStartDragOffset.target)) ) {
				// Snap to Element
				_self.addMoveElementToQueue(Math.round(_self.current));
			}
	
			_self.dragStartPosition = false;
			_self.scrollerStartDragOffset = false;
			_self.scrollerIsDragging = false;
			_self.scrollerDragOffset = 0;
			_self.setSliderPosition();
			setTimeout( function() { _self.mouseDownByDrag = false; }, 100);
		};
		
		this.scrollerClick = function(e) {
			
			if ( _self.mouseDownByDrag ) { return; }
			if ( ((e.target) ? e.target : e.srcElement) != _self.scroller.parentNode) { return; }
			// this.debug.innerHTML = "Scroller Click " + ((e.target) ? e.target : e.srcElement).id;
			
			_self.mouseDownByDrag = true;
			
			_self.dragStartPosition = _self.scroller.offset().left + _self.scroller.width()/2;
			_self.scrollerStartDragOffset = false;
			_self.scrollerIsDragging = true;
			
			_self.drag(e);
			_self.dragStop(e);
			_self.mouseDownByDrag = false;
	
			
		};
		
		this.scrollerSideDown = function(e) {
		
			if ( _self.scrollerDownIntervall !== false ) { return; }
			_self.dbgMessage("Side Down");
	
			_self.handle(e.data.direction);
			_self.scrollerDownIntervall = window.setInterval( function() { _self.handle(e.data.direction); }, 500);
		};
		
		this.scrollerSideUp = function() {
			if ( _self.scrollerDownIntervall === false ) { return; }
			_self.dbgMessage("Side Up");
	
			window.clearInterval(_self.scrollerDownIntervall);
			_self.scrollerDownIntervall = false;
		};
		
		this.specialClick = function(e) {
	
			if ( _self.mouseDownByDrag ) { return; }
	
			// If we have the popupviewer, lets do some action!
			if ( typeof popupviewer == 'undefined' ) {
				return;
			}
			
			if ( (whereToMove = _self.getClickImage(e)) === false ) { return; }
			
			var viewer = new popupviewer();
	
			// Overwrite function
			viewer.skipToImage = function(itemNr) {
	
				var didMoveTo = _self.handle(itemNr);
				if ( didMoveTo === false ) { return; }
				
				var imageElement = _self.checkedImages[didMoveTo];
	
				imageElement.image.onclick = function(e) { _self.specialClick(e); };
	
				if (imageElement.image) {
					imageElement.image.click();
				}
			};
			
			viewer.popupImageStack = _self.checkedImages;
			var linkTo = _self.checkedImages[whereToMove].imgData.linkto || _self.checkedImages[whereToMove].imgData;
			
			viewer.init(e);
			if ( linkTo.isImage === true ) {
				viewer.displayContent(linkTo.src, true);
			} else {
				viewer.loadAndDisplayPage(linkTo.src, linkTo.width, linkTo.height, null, linkTo.params);
	    		viewer.isImage = true;
				viewer.page = _self.checkedImages[whereToMove].id;
			}
		};
		
		this.elementClick = function(e) {
	
			if ( _self.mouseDownByDrag ) { return; }
			if ( (whereToMove = _self.getClickImage(e)) === false ) { return; }
	
			if ( _self.timeOutAction ) {
				clearTimeout(_self.timeOutAction);
				_self.timeOutAction = null;
				_self.whereToMoveQueue = new Array();
			}
			
			_self.addMoveElementToQueue(whereToMove);
		};
		
		this.getClickImage = function(e) {

			var whereToMove = 0;
			$.grep(_self.checkedImages, function(elem, index){
				if ( e.target == elem.image.get(0) ) {
					whereToMove = index;
					return false;
				}
			});

			return whereToMove;
		};
		
		this.checkForPopUp = function() {
			if ( document.location.href.indexOf('#') < 0 ) { return; }
			var extend = document.location.href.substr(document.location.href.indexOf('#'));
			if ( typeof extend == "undefined" || !$(extend) ) { return; }
	
			var e = {};
			e.target = $(extend);
			this.elementClick(e);
			this.specialClick(e);
		};
		
		this.globalEvent = function(e) {
			
			var delta = false;
			
			if (e.keyCode) {
				switch (e.keyCode) {
				/* Right arrow key */
				case 39:
					delta = 1;
					break;
	
				/* Left arrow key */
				case 37:
					delta = -1;
					break;
				}
			} else if (e.originalEvent.wheelDelta) {
				delta = -e.originalEvent.wheelDelta;
			}
			
			if ( delta ) {
				e.stopPropagation();
				_self.handle(delta  > 0 ? 1 : -1);
				return false;
			}
		};
	};
	
	$(function(){
		function img(url) {
			var i = new Image;
			i.src = url;
			return i;
		}
	 
		if ('naturalWidth' in (new Image)) {
			$.fn.naturalWidth  = function() { return this[0].naturalWidth; };
			$.fn.naturalHeight = function() { return this[0].naturalHeight; };
			return;
		}
		$.fn.naturalWidth  = function() { return img(this.src).width; };
		$.fn.naturalHeight = function() { return img(this.src).height; };
	});
	
	$(function(){
		$('div.imageflow_wrapper').each(function(){
			(new imageflow_plugin(this)).init();
		});
	});
})(jQuery);