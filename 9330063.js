
/*
	Name:  潮流轉蛋機
	Place: 轉蛋屋
*/

load('nashorn:mozilla_compat.js');
importPackage(Packages.handling.world);
importPackage(Packages.tools);
importPackage(Packages.server);
var status = -1;

//-----------------------設定類
var Name = "楓葉轉蛋機"; 
var Open = 1; //填0 只有GM可以使用
var Level = 30; //可以使用轉蛋機的等級
var requireItem = 5220040; //轉蛋卷代碼
var Guaranteed = 4031365; //每抽轉蛋可以獲得的道具 不需要的話填0
var show = [1122024,1122025,1012168,2049101]; //顯示大獎
var show1 = [1122023,1012070,1012167,1102041,1102042]; //顯示大獎
var show2 = [1002602,1112922,1012164]; //顯示大獎
var show3 = [4031365]; //顯示大獎


//-----------------------
var Sec;
var combine = 0;

function action(mode, _type, selection) {
    if (mode == 1) {
        status++;
    } else {
		cm.sendOk("期待你下次光臨");
        cm.dispose();
        return;
    }

    switch (status) {
        case 0:
			if (Open == 0 && !cm.getPlayer().isGM()){
            cm.sendOk("轉蛋機維護中。");
			cm.dispose();
			}
			
            if (cm.getPlayer().getLevel() < Level) {
            cm.sendOk("轉蛋機只能從"+Level+"級開始使用。");
            status = -1;
            cm.dispose();
            break;
    		} else {
			var msg = "";
			msg += "本期楓葉轉蛋機主打大獎:\r\n";
			for (var i = 0; i < show.length; i++) {
			msg += "#L" + i + "##v" + item[i][0] + "# #t" + item[i][0] + "# x " + item[i][1] + "#l\r\n"#"";	
			}
			msg += "\r\n本期楓葉轉蛋機主打二獎:\r\n";
			for (var i = 0; i < show1.length; i++) {
			msg += "#i"+show1[i]+"#";
			}
			msg += "和各類武器強化卷軸100%";
			msg += "\r\n本期楓葉轉蛋機主打三獎:\r\n";
			for (var i = 0; i < show2.length; i++) {
			msg += "#i"+show2[i]+"#";	
			}
			msg += "\r\n本期楓葉轉蛋機額外贈品可兌換當期楓葉轉蛋物:\r\n";
			for (var i = 0; i < show3.length; i++) {
			msg += "#i"+show3[i]+"#";	
			}
			msg += "其餘好物非主打恕不放上，請至點我查看楓葉轉蛋機轉蛋物查看內容物";
			msg += "\r\n#b";
			msg += "#L0#神單抽入魂轉蛋機#l\r\n";
			msg += "#L1#10連抽快速出貨#l\r\n";
			msg += "#L2#30連抽連續出貨#l\r\n";
			msg += "#L998#點我查看楓葉轉蛋機轉蛋物!";
			if (cm.getPlayer().isGM()){
			msg += "#L999#點我更改此轉蛋機內容!(GM顯示功能)#l"
			}
            cm.sendOk(msg);
            break;
        }
        case 1: {
			if(selection == 998){
				cm.sendOk(cm.getGashapon().ShowItem(1));
				cm.dispose();
			} else if (selection == 999){
				cm.sendNext(cm.getGashapon().ShowItem("GM"));
			} else {
			if (selection == 0){
				Sec = 1;
			}
			if (selection == 1){
				Sec = 10;
			}
			if (selection == 2){
				Sec = 30;
			}
			
			var msg = "";
			if (cm.haveItem(requireItem,Sec)) {
			for (var i = 0; i < Sec; i++) {

                var gashapon = cm.getGashapon();
                if(gashapon != null) {
					if (cm.canHold()) {
                    	cm.gainItem(requireItem, -1);
						if (Guaranteed != 0){
						cm.gainItem(Guaranteed, 1);
						}
                        var gashaponItem = gashapon.generateReward();
                        var item = MapleInventoryManipulator.addbyId_Gachapon(cm.getPlayer().getClient(), gashaponItem.getItemId(), 1, true);
                        if(gashaponItem != null) {
                            if(gashaponItem.canShowMsg())
							World.Broadcast.broadcastMessage(MaplePacketCreator.getGachaponMega("[楓幣轉蛋機] " + cm.getPlayer().getName() +  " : 被他從楓幣轉蛋機轉到了，大家快恭喜他吧！", item, cm.getChannelNumber()));
			//75//cm.ItemMessage(gashaponItem.getItemId(),"" + cm.getPlayer().getName() +  " : 【"+cm.getItemName(gashaponItem.getItemId())+"】 被他從"+Name+"轉到了，大家快恭喜他吧！");            
Packages.tools.FileoutputUtil.logToFile("日誌/抽獎/楓葉轉蛋機.txt","\r\n " + Packages.tools.FileoutputUtil.CurrentReadable_Time() + " 玩家<" + cm.getPlayer().getName() + "> 楓葉轉蛋機 <"+cm.getItemName(gashaponItem.getItemId())+">");
							combine += 1;
							msg += "第"+combine+"抽獲得了#t" + gashaponItem.getItemId() + "##n#i" + gashaponItem.getItemId() + "#\r\n";
							cm.dispose();
                        } else {
                            cm.sendOk("轉蛋機維護中。");
							cm.dispose();
                        }
					} else {
						break;
					}
                    
                } else {
                    cm.sendOk("轉蛋機尚未開放。");
					cm.dispose();
                }
            }
            
			} else {
                cm.sendOk("很抱歉由於你沒有足夠的#b#i" + requireItem + "##k，所以不能轉蛋哦。");
			    cm.dispose();
			}
			cm.sendOk("轉蛋了"+combine+"次\r\n轉蛋您獲得了:\r\n"+msg+"");
			cm.dispose();
		    }
        }
		break;
        case 2:
		        sel = selection;
				if(sel == 10000){
		        cm.sendGetText("請輸入您要新增的物品代碼。");	
                status = 4;				
				break;	
				}else{
		        cm.sendGetText("請輸入您要更改的機率。");
	    	    break;
				}
		case 3:
		        cm.getGashapon().ChangeChance(cm.getPlayer(),sel,cm.getText());
		        cm.sendYesNo("您已順利調整機率!您是否要重載轉蛋機機率?\r\n(點選立即生效)");
				break; 
        case 4:
                cm.processCommand("!reloadgashapon");
                cm.sendOk("已順利重載轉蛋機機率!");
                status = -1;
                break;  
        case 5:		          
		        itemid = cm.getText();
		        cm.sendGetText("請輸入您要新增物品的機率。");
	    	    break;
        case 6:		          
		        chance = cm.getText();
		        cm.sendGetText("請問你是否要讓此物品上綠廣?(請填寫是或否!)");
	    	    break;				
		case 7:
		if(cm.getText()=="是"){
			msg = true;
		}else{
			msg = false;
		}
		        cm.getGashapon().AddItem(cm.getPlayer(),itemid,chance,msg);
		        cm.sendYesNo("您已順利新增轉蛋物品!您是否要重載轉蛋機?\r\n(點選立即生效)");
				break; 
        case 8:
                cm.processCommand("!reloadgashapon");
                cm.sendOk("已順利重載轉蛋機機率!");
                status = -1;
                break;  				
		default:
            cm.dispose();
    }
}