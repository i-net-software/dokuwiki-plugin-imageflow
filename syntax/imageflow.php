<?php
/**
 * Imageflow Plugin
 *
 * @license    GPL 2 (http://www.gnu.org/licenses/gpl.html)
 * @author     i-net software <tools@inetsoftware.de>
 * @author     Gerry Weissbach <gweissbach@inetsoftware.de>
 */

if(!defined('DOKU_INC')) die();
if(!defined('DOKU_PLUGIN')) define('DOKU_PLUGIN',DOKU_INC.'lib/plugins/');

require_once(DOKU_PLUGIN.'syntax.php');
require_once(DOKU_INC.'inc/search.php');
require_once(DOKU_INC.'inc/JpegMeta.php');

class syntax_plugin_imageflow_imageflow extends DokuWiki_Syntax_Plugin {

    var $glideToImage = 0;
    var $saveimages = '';
    var $imagedoc = '';
    var $namespace = null;
    var $reflection_conf = false;
    var $sectionID = array();
    var $header = array();

    function getType(){ return 'protected';}
    function getAllowedTypes() { return array('container','substition','protected','disabled','formatting','paragraphs'); }
    function getPType(){ return 'block';}

    /**
     * Where to sort in?
     */
    function getSort(){ return 301; }


    /**
     * Connect pattern to lexer
     */
    function connectTo($mode) {
        $this->Lexer->addEntryPattern('<imageflow>(?=.*?</imageflow.*?>)',$mode,'plugin_imageflow_imageflow');
        $this->Lexer->addEntryPattern('<imageflow [^>]+>(?=</imageflow.*?>)',$mode,'plugin_imageflow_imageflow');
    }

    function postConnect() {
        $this->Lexer->addPattern('<image\s.*?>.*?</image>','plugin_imageflow_imageflow');
        $this->Lexer->addPattern('[\r|\n]','plugin_imageflow_imageflow');
        $this->Lexer->addExitPattern('</imageflow.*?>', 'plugin_imageflow_imageflow');
    }

    /**
     * Handle the match
     */
    function handle($match, $state, $pos, &$handler){

        switch ($state) {
            case DOKU_LEXER_ENTER:

                if ( $match == '<imageflow>' ) { return array('imageflow__start', null); }

                if( preg_match('%<imageflow ([^>]+)>%', $match, $matches) ) {
                    return array('imageflow__start', $matches[1]);
                }

                break;

            case DOKU_LEXER_MATCHED:

                if ( !(strstr($match, '<image') || strstr($match, '</image>')) ) { return false; }
                list($orig, $desc) = explode('>', substr($match, 6, -8), 2);
                list($src, $title) = explode('|', $orig, 2);
                list($src, $params) = explode('?', $src, 2);
                $paramsFull = explode('&', str_replace('&amp;', '&', $params));

                $params = array();
                foreach( $paramsFull as $item ) {
                    list($key, $value) = explode('=', $item, 2);
                    if ( $key == 'width' ) $key = 'w';
                    if ( $key == 'height' ) $key = 'h';

                    $params[$key] = $value;
                }

                $data = array('src' => trim($src), 'params' => $params, 'desc' => trim($desc), 'w' => 200, 'title' => trim($title));

                if ( empty( $params['linkto'] ) ) {
                    $data['isImage'] = true;
                } else {
                    $data['linkto'] = wl(cleanID($params['linkto']));
                    unset($params['linkto']);
                }

                return array('image', $data);
                break;
            case DOKU_LEXER_UNMATCHED:
                break;
            case DOKU_LEXER_EXIT:

                if ( $match == '</imageflow>' ) { return array('imageflow__end', null); }
                break;
        }
        return false;
    }

    /**
     * Create output
     */
    function render($mode, &$renderer, $input) {
        global $conf;

        list($instr, $data) = $input;

        if( $mode == 'xhtml' || $mode == 'metadata' ) {
        
            if ( !is_array($this->header[$mode]) ) {
                $this->header[$mode] = array();
            }
        
            switch ( $instr ) {
                	
                case 'imageflow__start' :
                    	
                    $this->sectionID[] = sectionID("imageflow_container_", $this->header[$mode]);
                    $scID = $this->sectionID[sizeof($this->sectionID)-1];
                    	
                    if ($mode == 'xhtml') $renderer->doc .= <<<OUTPUT
	<div class="imageflow_wrapper" id="$scID">
		<noscript>
			<div class="hasscript">
OUTPUT;
                    if ( $data === null) { break; }

                    $retData = array();
                    list($id, $width) = explode('?', $data, 2);

                    $dir = str_replace(':','/',cleanID($id));
                    search($retData,$conf['mediadir'],'search_media',null,$dir);

                    foreach ( $retData as $item ) {
                        if ( !$item['isimg'] ) { continue; }

                        $imgData = array( 'src' => $item['id'] );

                        if ( empty($width)) $width = 300;
                        $imgData['params'] = array('w' => intval($width));
                        $imgData['id'] = sectionID(noNS($item['id']), $this->header[$mode]);
                        $imgData['isImage'] = true;

                        $this->_image($imgData, $renderer, $mode);
                    }

                    break;

                case 'image' :
                    $this->_image($data, $renderer, $mode);
                    break;
                case 'imageflow__end' :
                
                    if (sizeOf($sectionID) > 0) array_pop($sectionID);
                    if ($mode == 'xhtml') $renderer->doc .= <<<OUTPUT
			</div>
		</noscript>
	</div>
OUTPUT;
                    break;
            }
            return true;
        }

        return false;
    }

    /**
     * Defines how a thumbnail should look like
     */
    function _image($data, &$renderer=null, $mode='xhtml'){
        global $ID;

        if ( is_null($renderer) || empty($data['src']) ) { return false;}
        if ( !is_array($data['params'])) { $data['params'] = array(); }

        //prepare link attributes
        // can use reflected images
        $reflect = array();
        if ( $reflection = plugin_load('syntax', 'reflect')) {
            $reflect = array('reflect' => $this->getConf('reflect') ? 1 : 0, 'bgc' => $this->getConf('reflectBackground'));
        }

        // Start Section
        if ($mode != 'metadata' ) $renderer->doc .= '<div class="imageflow_image">' . NL;

        // Display
        $data['params']['tok'] = media_get_token($data['src'], $data['params']['w'], $data['params']['h']);

        $href = ml($data['src'], array_merge($data['params'], $reflect), true, '&');
        if ($mode != 'metadata' && empty($data['alternate_desc']) ) $renderer->doc .= '<img src="' . $href . '" alt="" class="imageflow__noscript__image media"/>';

        // Set Data
        $fn = mediaFN($data['src']);
        $data['src'] = ml($data['src']);
        $data['params'] = array_merge($data['params'], $reflect); // Remove everything except the params.
        $data['desc'] = trim($data['desc']);
        $data['title'] = trim($data['title']);

        if ( empty($data['desc']) && ($meta = new JpegMeta($fn))) {

            $data['title'] = $meta->getField('Iptc.Headline');
            $data['desc'] = $meta->getField('Iptc.Caption');
        }

        if ($mode != 'metadata') {
            	
            if ( !empty($data['alternate_desc']) ) {
                $renderer->doc .= $data['alternate_desc'];
            } else {

                $renderer->doc .= '<div class="imageflow_caption">' . NL;
                if ( !empty($data['title']) ) {
                    $renderer->doc .= "<h3 class=\"imageflow__title\">{$data['title']}</h3>" . NL;
                }
                if ( !empty($data['desc']) ) {
                    $renderer->doc .= "<p class=\"imageflow__text\">{$data['desc']}</p>" . NL;
                }

                // End Caption
                $renderer->doc .= '</div>' . NL;
            }
            // End Section
            $renderer->doc .= '<div class="clearer"></div>' . NL . '</div>' . NL;
        } else {
            // Add Metadata
            unset($data['alternate_desc']);
            if ( !$data['isImage'] && !empty( $data['linkto'] ) ) {
                $data['src'] = $data['linkto'];
                unset( $data['linkto'] );
            }

            $renderer->meta['relation']['imageflow'][$this->sectionID[sizeof($this->sectionID)-1]][] = $data;
        }

        return $data;
    }

    function isSingleton() {
        return true;
    }
}

//Setup VIM: ex: et ts=4 enc=utf-8 :
