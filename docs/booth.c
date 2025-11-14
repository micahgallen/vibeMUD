/*
Changed to keep buttons in sequence may 1999
Created by ROokY december 1992
*/
inherit "/std/object/move";
inherit "/std/room";
inherit "/std/basic/id";

//#define BOOTH "/obj/booth"
#define DELOREAN "creators/t/texan/bttf/delorean"
#include <move_failures.h>

mapping dest;
mixed  *domain;

string button_desc();

void add_alias(string str)
{
  room::add_alias(str);
  id::add_alias(str);
}

void remove_alias(string str)
{
  room::remove_alias(str);
  id::remove_alias(str);
}

create()
{
    id::create();
    room::create();
}

setup()
{
    int i;
    string  *list;
    mixed *tmp;

    set_name("booth");
    set_short("Booth");
    set_light(60);
    set_long(
      "The Transporter Booth.\n"+
      "This booth looks a lot like one of those picture-taking booths you see in "+
      "malls and at fairs.  Directly in front of you there is a strange looking "+
      "camera.  On the wall to your right there are lots of buttons, and a sign "+
      "that contains instructions on how to use the booth.\n");
    add_item("camera","It looks like an ordinary camera.\n");
    dest = ([ 
    "Present":({ 3, "/creators/t/texan/bttf/1985/rooms/twinpinesmall" }),
    "Port Looney":({ 8, "/d/portlooney/start.c" }),
    "Gotham":({ 5, "/d/Gotham/gotham/streets/rooms/main-st-1" }),
    "Marvel":({ 1, "/d/Gotham/marvel/quest/rooms/forest/forest22" }),          
    "Warner Bros.":({ 3, "/d/WB/rooms/city02" }),
    "Gilligan":({ 0, "/d/Gilligan/roo/foyer" }),
    "Simpsons":({ 6, "/d/Simpsons/park/park1" }),
    "Sesame":({ 4, "/d/sesame/rooms/sesame_00" }),
    "Hanna Barbera":({ 2, "/d/HB/jellystone/rooms/js_path" })
  ]);
    list=keys(dest);
    domain=({ 0,0,0,0,0,0,0,0,0});
    for (i=0; i<sizeof(list); i++) {
        tmp=dest[list[i]];
        domain[(int)tmp[0]]=list[i];
    }
    add_item( ({"button","buttons"}), button_desc() );
    add_item("sign", "You can read it.\n"); 
    reset_get();
}

string button_desc(){
    int i,half;
    string str;

    str="";
    half=(sizeof(domain)+2)/3;
    for (i=0; i<half; i++) {
        if (i+2*half<sizeof(domain)) {
            str+=" +---+               +---+               +---+\n";
            str+=" | "+sprintf("%2-d| %-14s",i+1,nocolors(domain[i]))+
            "| "+sprintf("%2-d| %-14s",i+1+half,nocolors(domain[i+half]))+
            "| "+sprintf("%2-d| %-14s",i+1+2*half,nocolors(domain[i+2*half]))+"\n";
            str+=" +---+               +---+               +---+\n\n";
        }
		else {
            if (i+half<sizeof(domain)) {
                str+=" +---+               +---+\n";
                str+=" | "+sprintf("%2-d| %-14s",i+1,nocolors(domain[i]))+
                "| "+sprintf("%2-d| %-14s",i+1+half,nocolors(domain[i+half]))+"\n";
                str+=" +---+               +---+\n\n";
            }
            else {
                str+=" +---+\n";
                str+" | "+sprintf("%2-d| %-14s",i+1,nocolors(domain[i]))+"\n";
                str+=" +---+\n";
            }        
        }
    }
    return "You see "+query_num(sizeof(domain))+
    " buttons. You can go to: \n\n"+str;
}


string long(string str, int dark) {
  string ret = "";

    if(this_player()){
        if(environment(this_object())!=environment(this_player()))
            return room::long(str,dark);
    }
    if(!this_player()->query_property("no_ascii_art") && environment(this_player())->query_ascii())
      ret += environment(this_player())->query_ascii()+"\n";
    ret += "This booth looks alot like one of those picture-taking "+
    "booths you see in malls and at fairs. It looks very inviting.\n"+
    "Why not enter and give it a try?\n";

    return ret;
}

void init() {
    ::init();
    if (environment(this_player())==environment(this_object()))
        add_action("do_enter","enter");
    else
	if (environment(this_player())==this_object()) {
        add_action("do_leave","out");  
        add_action("read", "read");
        add_action("read", "exa");
        add_action("press", "press");
        add_action("press", "push");
    }
}

int do_enter(string str) {
    if (!str) {
        notify_fail("Enter what?\n");
        return 0;
    }
    if (str!="transporter booth" && str!="transporter" && str!="booth") {
        notify_fail("There is no "+str+" to "+query_verb()+".\n");
        return 0;
    }
    if (environment(this_player())==this_object()) {
        write("You are already inside!\n");
		return 1;
    }
    tell_room(environment(this_player()),this_player()->query_cap_name()+" enters the booth.\n",this_player());
    this_player()->move(this_object());
    this_player()->look_me();
    tell_room(this_object(),this_player()->query_cap_name()+" enters.\n",this_player());
    return 1;
}

do_leave(string str) {
    if (!environment(this_player())==this_object()) {
        notify_fail("Leave???\n");
        return 0;
    }
    if (str && str!="booth") {
        notify_fail(capitalize(query_verb())+" what?\n");
        return 0;
    }
    tell_room(this_object(),this_player()->query_cap_name()+" leaves the Booth.\n",this_player());
    this_player()->move(environment(this_object()));
	this_player()->look_me();
    tell_room(environment(this_player()),this_player()->query_cap_name()+" comes out of the booth.\n",this_player());
    return 1;
}

read(str) {
    if (str != "sign" && str != "instructions") {
        notify_fail("Read what?\n");
        return 0;
    }
    write(
      "                    LOONEY TRANSPORTATION BOOTH \n"+
      " \n"+
      "                 This machine is very easy to use.\n"+
      " 1. Examine the buttons and decide where you want to go.\n"+
      " 2. Press the button that is beside the name of the place you \n"+
      "    to go.\n"+
      "             Ex: 'press <num>' or press '<name of domain>'\n");
    return 1;
}

int press(string str) {
    int i;
    string destdomain,destdir;
    object destbooth,destdirobj;
    mixed *desti;

    if (!str) {
        write("Press which button?\n");
        return 1;
    }
    destdomain=capitalize(str);
    desti=dest[destdomain];
    if (desti) destdir=(string)desti[1];
    if (!destdir && sscanf(str,"%d",i)==1 && i>0 && i<=sizeof(domain)) {
        destdomain=domain[i-1];
        destdir=dest[destdomain][1];
    }
    if (!destdir) {
        write("There is no such button.\n");
		return 1;
    }
    if (!(destdirobj=find_object(destdir))) {
        if (catch(call_other(destdir, "??"))) {
            write("The domain seems to be out of order.\n");
            return 1;
        }
        else
            destdirobj=find_object(destdir);
    }
    destbooth=present(BOOTH,destdirobj);
    if (!destbooth) {
        destbooth=new(BOOTH);
        destbooth->move(destdirobj);
    }
    write("You press the button for "+capitalize(destdomain)+".\n");
    tell_room(this_object(),this_player()->query_cap_name()+
      " presses the button for "+capitalize(destdomain)+".\n",
      this_player());
    call_out("mesg0",1,({ this_player(), destbooth }));
	return 1;
}

void
mesg0(mixed *arg) {
    tell_room(environment(arg[0]),
      "The camera begins to hum softly.\n");
    tell_object(arg[0],"\n\n");
    call_out("mesg1",3,arg);
}

void
mesg1(mixed *arg) {
    if (!arg[0] || environment(arg[0])!=this_object()) return;
    tell_room(this_object(),
      arg[0]->query_cap_name()+" dissolves into pure energy.\n",arg[0]);
    tell_object(arg[0],
      "As you look down, you then notice that you are being broken down into\n"+
      "small particles.\n\n");
    call_out("mesg2",2,arg);
}

void
mesg2(mixed *arg) {
    if (!arg[0] || environment(arg[0])!=this_object()) return;
    tell_object(arg[0],
      "You then feel a strange pulling sensation as you are sucked into the camera.\n\n" );
    tell_room(environment(arg[0]),arg[0]->query_cap_name()+
      "'s energy is sucked into the camera.\n",arg[0]);
    call_out("mesg3",1,arg);
}

void 
mesg3(mixed *arg) {
    if (!arg[0] || environment(arg[0])!=this_object()) return;
    if ((int)arg[0]->move(arg[1])!=MOVE_OK) {
        tell_object(arg[0],"Something went wrong and you're thrown back.\n");
        tell_room(this_object(),(string)arg[0]->query_cap_name()+
          " is thrown back from the camera.\n");
        return;
	}
    tell_object(arg[0],"Suddenly you are standing in a different booth.\n");
    tell_room(arg[1],arg[0]->query_cap_name()+
      " is thrown out of the camera.\n",arg[0]);
}

varargs int move(mixed dest, mixed messin, mixed messout) {
    add_exit("out",file_name(dest),"door");
    return ::move(dest, messin, messout);
}
