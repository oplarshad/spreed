/* global _, $ */

/**
 *
 * @copyright Copyright (c) 2017, Daniel Calviño Sánchez (danxuliu@gmail.com)
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

(function(_, $) {

	'use strict';

	OCA.SpreedMe = OCA.SpreedMe || {};
	OCA.SpreedMe.Views = OCA.SpreedMe.Views || {};

	// TODO documentation
	var VirtualList = function($container) {
		this._$container = $container;

		this._$firstElement = null;
		this._$lastElement = null;
		this._$firstVisibleElement = null;
		this._$lastVisibleElement = null;

		this._$wrapperBackground = $('<div class="wrapper-background"></div>');
		this._$wrapperBackground.height(0);

		this._$wrapper = $('<div class="wrapper"></div>');
		this._$wrapper._top = 0;

		this._$container.append(this._$wrapperBackground);
		this._$container.append(this._$wrapper);

		var self = this;
		this._$container.on('scroll', function() {
			self.updateVisibleElements();
		});
		$(window).resize(_.debounce(function() {
			self.updateVisibleElements();
		}, 200));
	};

	VirtualList.prototype = {

		getLastElement: function() {
			return this._$lastElement;
		},

		addElementStart: function() {
			this._addedElementsBuffer = document.createDocumentFragment();

			delete this._$firstAddedElement;
		},

		addElement: function($el) {
			this._addedElementsBuffer.append($el.get(0));

			if (this._$lastElement) {
				this._$lastElement._next = $el;
			}
			$el._previous = this._$lastElement;
			$el._next = null;
			this._$lastElement = $el;

			if (!this._$firstElement) {
				this._$firstElement = $el;
			}

			if (!this._$firstAddedElement) {
				this._$firstAddedElement = $el;
			}
		},

		addElementEnd: function() {
			var wrapper = this._$wrapper;
			var removeWrapper = false;

			// If the element is not appended right after the last rendered
			// element then just add it temporary to calculate its height and
			// then remove it.

			// TODO do not base it on whether it goes after the last rendered
			// element or not, but on whether it is visible or not, as this
			// could cause more and more elements to be added to the end without
			// limit; once one element is added after the last rendered element
			// it becomes the last rendered element, so the next added element
			// becomes the last rendered element, and the next added element
			// becomes... and so on. Scrolling to the last element ensures that
			// older elements are recycled, so everything is fine in that case,
			// but scrolling is a behaviour specific of this list.
			// However, the scrolling will cause that any item added will be
			// added and removed, and later added again when scrolling to the
			// end; it would be better to add some buffer/margin to decide
			// whether to add the elements or just calculate their height and
			// then remove them instead of using a hard limit on whether it is
			// visible or not.
			if (this._$lastVisibleElement && (this._$lastVisibleElement._next !== this._$firstAddedElement || this._$lastVisibleElement._top - this._$container.scrollTop() > this._$container.outerHeight())) {
				wrapper = $('<div class="wrapper"></div>');

				if (this._$firstAddedElement._previous && this._$firstAddedElement._previous.length > 0) {
					wrapper.css('top', this._$firstAddedElement._previous._topRaw);
					wrapper._top = this._$firstAddedElement._previous._topRaw;

					// Include the previous element, as it may change the
					// position of the newest element due to collapsing margins
					// TODO clone?
					wrapper.append(this._$firstAddedElement._previous);
				}

				this._$container.append(wrapper);
				removeWrapper = true;
			}

			// TODO height can not be used in Firefox, as jQuery rounds to
			// the nearest integer but Firefox has subpixel accuracy
			var previousWrapperHeight = wrapper.height();

			wrapper.append(this._addedElementsBuffer);
			delete this._addedElementsBuffer;

			this._$wrapperBackground.height(this._$wrapperBackground.height() + wrapper.height() - previousWrapperHeight);

			if (!this._$firstVisibleElement) {
				// TODO _$firstAddedElement instead?
				this._$firstVisibleElement = this._$firstElement;
			}

			while (this._$firstAddedElement) {
				if (!removeWrapper) {
					this._$lastVisibleElement = this._$firstAddedElement;
				}

				this._$firstAddedElement._height = this._getElementOuterHeight(this._$firstAddedElement);

				// TODO the top position of an element must be got from the
				// rendered element; it can not be based on the top position and
				// height of the previous element, because the browser may
				// merge/collapse the margins.
				this._$firstAddedElement._top = wrapper._top + this._getElementTopPosition(this._$firstAddedElement);
				this._$firstAddedElement._topRaw = this._$firstAddedElement._top;
				var marginTop = parseFloat(this._$firstAddedElement.css('margin-top'));
				if (marginTop < 0) {
					this._$firstAddedElement._topRaw -= marginTop;
				}

				this._$firstAddedElement = this._$firstAddedElement._next;
			}

			// Remove the temporal wrapper used to layout and get the height of
			// the added items.
			if (removeWrapper) {
				wrapper.remove();
			}
		},

		_getElementTopPosition: function($element) {
			// TODO top can not be used in Firefox, as jQuery rounds to
			// the nearest integer but Firefox has subpixel accuracy

			// When the margin is positive, jQuery returns the proper top
			// position of the element (that is, including the top margin).
			// However, when it is negative, jQuery returns where the top
			// position of the element would be if there was no margin. Grouped
			// messages use a negative top margin to "pull them up" closer to
			// the previous message, so in those cases the top position returned
			// by jQuery is below the actual top position of the element.
			var marginTop = parseInt($element.css('margin-top'));
			if (marginTop >= 0) {
				return $element.position().top;
			}

			return $element.position().top + marginTop;
		},

		_getElementOuterHeight: function($element) {
			// TODO height can not be used in Firefox, as jQuery rounds to
			// the nearest integer but Firefox has subpixel accuracy

			// When the margin is positive, jQuery returns the proper outer
			// height of the element. However, when it is negative, it
			// substracts the negative margin from the overall height of the
			// element. Grouped messages use a negative top margin to "pull them
			// up" closer to the previous message, so in those cases the outer
			// height returned by jQuery is smaller than the actual height.
			var marginTop = parseInt($element.css('margin-top'));
			if (marginTop >= 0) {
				return $element.outerHeight(true);
			}

			return $element.outerHeight(true) - marginTop;
		},

		updateVisibleElements: function() {
			var currentScroll = this._$container.scrollTop();

			// TODO check that contacts menu and similar work
			// TODO handle loss of focus when elements are removed
			// TODO handle lossing selected text when an element is removed in
			// scroll

			// TODO handle resizing the width, which in turn changes the top
			// position and height of all the elements!

			if (!this._$firstVisibleElement) {
				return;
			}

			// TODO base calculations on the next/previous element top instead
			// of in the current element top position and its height?

			if (-currentScroll + this._$firstVisibleElement._top + this._$firstVisibleElement._height >= 0 &&
					-currentScroll + this._$firstVisibleElement._top <= 0 &&
					-currentScroll + this._$lastVisibleElement._top <= this._$container.outerHeight() &&
					-currentScroll + this._$lastVisibleElement._top + this._$lastVisibleElement._height >= this._$container.outerHeight()) {
				return;
			} else {
				this._$wrapper.detach();
			}

			// The currently viewable area does not contain any of the rendered
			// elements.
			if (-currentScroll + this._$firstVisibleElement._top + this._$firstVisibleElement._height > this._$container.outerHeight() ||
					-currentScroll + this._$lastVisibleElement._top + this._$lastVisibleElement._height < 0) {
				// Remove all rendered elements
				while (this._$firstVisibleElement !== this._$lastVisibleElement._next) {
					this._$firstVisibleElement.detach();
					this._$firstVisibleElement = this._$firstVisibleElement._next;
				}

				// Render the new first element
				this._$wrapper._top = 0;

				this._$firstVisibleElement = this._$firstElement;
				while (-currentScroll + this._$firstVisibleElement._top + this._$firstVisibleElement._height < 0) {
					this._$firstVisibleElement = this._$firstVisibleElement._next;
				}

				this._$firstVisibleElement.prependTo(this._$wrapper);

				this._$lastVisibleElement = this._$firstVisibleElement;
			}

			// Remove leading elements no longer visible.
			while (-currentScroll + this._$firstVisibleElement._top + this._$firstVisibleElement._height < 0) {
				// TODO The height itself is not removed, as the items could be
				// pulled up into the previous item due to negative margins; the
				// difference between top positions is the proper measure.
				var removedHeight = this._$firstVisibleElement._next._top - this._$firstVisibleElement._top;
// 				var removedHeight = this._$firstVisibleElement._height;
				this._$firstVisibleElement.detach();
				this._$firstVisibleElement = this._$firstVisibleElement._next;
			}

			// Prepend leading elements now visible.
			while (-currentScroll + this._$firstVisibleElement._top > 0) {
				var addedHeight = this._$firstVisibleElement._top - this._$firstVisibleElement._previous._top;
// 				var addedHeight = this._$firstVisibleElement._previous._height;
				this._$firstVisibleElement._previous.prependTo(this._$wrapper);
				this._$firstVisibleElement = this._$firstVisibleElement._previous;
			}

			// Align wrapper with the top raw position (without negative
			// margins) of the first rendered element.
			this._$wrapper._top = this._$firstVisibleElement._topRaw;
			this._$wrapper.css('top', this._$wrapper._top);

			// Remove trailing elements no longer visible.
			while (-currentScroll + this._$lastVisibleElement._top > this._$container.outerHeight()) {
				this._$lastVisibleElement.detach();
				this._$lastVisibleElement = this._$lastVisibleElement._previous;
			}

			// Append trailing elements now visible.
			while (-currentScroll + this._$lastVisibleElement._top + this._$lastVisibleElement._height < this._$container.outerHeight()) {
				this._$lastVisibleElement._next.appendTo(this._$wrapper);
				this._$lastVisibleElement = this._$lastVisibleElement._next;
			}

			this._$wrapper.appendTo(this._$container);
		},

	};

	OCA.SpreedMe.Views.VirtualList = VirtualList;

})(_, $);
