#!/usr/bin/perl


# $Source: /web/cvs/olc/webapp/cgi/pluginpop.cgi,v $
# $Revision: 1.8 $
# $Author: johnr $
# $Date: 2004/07/22 16:33:07 $
#
# Copyright 2001 The McGraw-Hill Companies.
# All Rights Reserved
#
# REVISION HISTORY 
# -------------------------
# NOTE: CVS automatically inserts check-in comments below.  Add
# manually only if reqd.
#
# $Log: pluginpop.cgi,v $
# Revision 1.8  2004/07/22 16:33:07  johnr
# Add UTF8 charset to CGI header declaration
#
# Revision 1.7  2003/06/01 20:33:07  jsudol
# Set the width of the RealAudio controls panel to be the same as the asset
#
# Revision 1.6  2003/06/01 20:30:27  jsudol
# One last time with RealAudio
#
# Revision 1.5  2003/06/01 20:18:47  jsudol
# Again with the RealAudio.  This time I grabbed the code right off their site.
#
# Revision 1.4  2003/06/01 19:38:35  jsudol
# Again, changes to RealAudio.
#
# Revision 1.3  2003/06/01 18:47:08  jsudol
# The code for Real Audio has been modified and I removed the HTML page margins.
#
# Revision 1.2  2003/04/13 02:28:24  daniel
# First version with new CVS structure; not yet fully tested
#
#



use CGI;
use LWP::Simple;
my $q = new CGI;

print $q->header("text/html; charset=UTF-8");

# have to use '::' as the separator because & screws up the xsl parser
my ($filetype,$w,$h,$url,$name) = split("::",$q->param('it'));


# figure out which html to use to display the given file type
if ($filetype eq "gif" or $filetype eq "jpg") {
	$embedcode = <<EOC;
		<img src="$url" width="$w" height="$h">
EOC

} elsif ($filetype eq "dcr") {
	$embedcode = <<EOC;
	<object classid="clsid:166B1BCA-3F9C-11CF-8075-444553540000"
		codebase="http://download.macromedia.com/pub/shockwave/cabs/director/sw.cab#version=7,0,0,0"
		width="$w" height="$h">
		<param name="SRC" value="$url">
		<embed SRC="$url" width="$w" height="$h" type="application/x-director" pluginspage="http://www.macromedia.com/shockwave/download/"></embed>
	</object>
EOC

} elsif ($filetype eq "swf") {
	$embedcode = <<EOC;
	<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
		codebase="http://http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=5,0,0,0"
		width="$w" height="$h">
		<param name="PLAY" value="true">
		<param name="LOOP" value="true">
		<param name="QUALITY" value="high">
		<param name="MOVIE" value="$url">
		<embed src="$url" width="$w" height="$h" play="true" 
			loop="true" quality="high" 
			pluginspage = "http://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash"
			type="application/x-shockwave-flash"> 
		</embed>
	</object>
EOC

} elsif ($filetype eq "ra") {
	if ($h eq "") {$h = "45"}
	if ($w eq "") {$w = "150"}
	$embedcode = <<EOC;
	<object id="RAOCX" classid="clsid:CFCDAA03-8BE4-11cf-B84B-0020AFBBCCFA" height="105" width="200">
		<param name="controls" value="ControlPanel,InfoVolumePanel">
		<param name="autostart" value="false">
		<param name="SRC" value="$url">
		<embed console="x" src="$url" CONTROLS="PlayButton,PositionSlider" width="200" height="105" align="absmiddle">
	</object>

EOC

} elsif ($filetype eq "rm" or $filetype eq "rpm") {
	if ($h eq "") {$h = "45"}
	if ($w eq "") {$w = "150"}
	$embedcode = <<EOC;
	<object id="RVOCX" classid="clsid:CFCDAA03-8BE4-11cf-B84B-0020AFBBCCFA"
		height="$h" width="$w">
		<param name="src" value="$url">
		<param name="controls" value="ImageWindow">
		<param name="autostart" value="false">
		<param name="console" value="one">
		<embed console="one" src="$url" NOJAVA="true" autostart="false"
		controls="ImageWindow" WIDTH="$w" HEIGHT="$h"><br>
	</object>
	<br clear="all">
	<object id="RVOCX" CLASSID="clsid:CFCDAA03-8BE4-11cf-B84B-0020AFBBCCFA"
		height="100" width="$w">
		<param name="controls" value="all">
		<param name="console" value="one">
		<embed src="plugin.rpm" src="$url" NOJAVA="true" autostart="false"
		controls="all" WIDTH="$w" HEIGHT="100"
	</object>

EOC

} elsif ($filetype eq "mov") {
	$h += 16;
	$embedcode = <<EOC;
	<object classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" width="$w" height="$h" codebase="http://www.apple.com/qtactivex/qtplugin.cab">
	<param name="src" value="$url">
	<param name="autoplay" value="true">
	<param name="controller" value="true">
	<embed src="$url" width="$w" height="$h" nojava="true" controller="true" autostart="true"></embed>
</object>
EOC

} else {
	# last resort
	$embedcode =<<EOC;
	<object width="$w" height="$h">
	<param name="src" value="$url">
	<param name="autoplay" value="true">
	<param name="controller" value="true">
	<embed src="$url" width="$w" height="$h" nojava="true" controller="true" autostart="true">
</embed>
</object>

EOC

}

# if no width or height, strip that out of the code
$embedcode =~ s/width=""//g;
$embedcode =~ s/height=""//g;

print <<EOM;
<html><head><title>$name</title>
<meta http-equiv="expires" content="0">
<meta http-equiv="Pragma" content="no-cache">
<META http-equiv="Content-Type" content="text/html; charset=utf-8">
</head>
<body bgcolor="#FFFFFF" text="#000000" marginheight="0" marginwidth="0" topmargin="0" leftmargin="0">
<center>
<table border=0 width=100% height=100% cellpadding=0 cellspacing=0>
<tr><td align=center valign=middle>

$embedcode

</td></tr>
</table>
</body></html>

EOM

exit;
