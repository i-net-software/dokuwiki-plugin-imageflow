<?php
/**
 * Imageflow Plugin
 *
 * @license    GPL 2 (http://www.gnu.org/licenses/gpl.html)
 * @author     i-net software <tools@inetsoftware.de>
 * @author     Gerry Weissbach <gweissbach@inetsoftware.de>
 */

// must be run within Dokuwiki
if(!defined('DOKU_INC')) die();

if(!defined('DOKU_PLUGIN')) define('DOKU_PLUGIN',DOKU_INC.'lib/plugins/');
require_once(DOKU_PLUGIN.'action.php');

class action_plugin_imageflow extends DokuWiki_Action_Plugin {

    private $functions = null;
    private $POSTcheck = 'show_sample';

    function register(Doku_Event_Handler $controller) {

        // Support given via AJAX
        $controller->register_hook('TOOLBAR_DEFINE', 'AFTER', $this, 'toolbar_add_button', array ());
        $controller->register_hook('DOKUWIKI_STARTED', 'BEFORE', $this, 'metaheader_add_images', array ());
        $controller->register_hook('POPUPVIEWER_DOKUWIKI_STARTED', 'BEFORE', $this, 'popupviewer_metaheader_add_images', array ());
    }

    /**
     * Inserts a toolbar button
     */
    function toolbar_add_button(& $event, $param) {
        $event->data[] = array (
            'type' => 'format',
            'title' => $this->getLang('toolbar_picker'),
            'icon' => '../../plugins/imageflow/images/namespace_picker.png',
            'open' => '<imageflow ',
            'sample' => ':namespace:goes:here:',
            'close' => '></imageflow>',
        );
    }

    function metaheader_add_images( &$event, $param ) {
        global $ID, $JSINFO;

        $metaData = p_get_metadata($ID, "relation imageflow", true);
        $JSINFO['relation']['imageflow'] = $metaData;
    }

    function popupviewer_metaheader_add_images( &$event, $param ) {
        global $ID, $JSINFO;

        $this->metaheader_add_images( $event, $param );
        if ( empty($JSINFO['relation']['imageflow']) ) {
            return;
        }

        $head =& $event->data;

        $script = '(function($){$(function(){$("div.imageflow_wrapper").each(function(){new imageflow_plugin(this);});});})jQuery);';

        $head['script'][] = array( 'type'=>'text/javascript', '_data'=> $script);
    }
}