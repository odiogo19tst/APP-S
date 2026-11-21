package br.com.doapps.grauelive;
public final class UserToneReadSessionSelfTest {
 static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
 public static void main(String[] args){
  UserToneReadSession noReply=new UserToneReadSession(0);check(noReply.poll(0)==0,"First request probes only USER001");check(noReply.poll(100)==-1&&noReply.sent()==1,"No blind scheduling");check(!noReply.acknowledge(1,100),"Unrelated reply ignored");check(noReply.poll(1200)==-1&&!noReply.active()&&noReply.sent()==1,"No response stops after one request");
  UserToneReadSession success=new UserToneReadSession(100);long now=100;
  for(int i=0;i<256;i++){check(success.poll(now)==i,"Ordered request "+i);check(success.poll(now+1)==-1,"Only one outstanding");check(success.acknowledge(i,now+20),"Expected name accepted");check(!success.acknowledge(i,now+21),"Duplicate not counted");check(success.poll(now+119)==-1,"Pacing between replies");now+=120;}
  check(success.poll(now)==-1&&!success.active()&&success.sent()==256&&success.received()==256,"Complete scan and exact counts");
  UserToneReadSession partial=new UserToneReadSession(0);partial.poll(0);partial.acknowledge(0,10);now=110;
  for(int i=1;i<=4;i++){check(partial.poll(now)==i,"Missing block request");now+=800;}
  check(partial.poll(now)==-1&&!partial.active()&&partial.sent()==5&&partial.received()==1,"Four consecutive misses stop partial scan");
  UserToneReadSession cancel=new UserToneReadSession(0);cancel.poll(0);cancel.cancel();check(!cancel.active()&&cancel.poll(9999)==-1&&!cancel.acknowledge(0,10000),"Cancel stops requests and ignores late acknowledgements");
  UserToneReadSession intermittent=new UserToneReadSession(0);intermittent.poll(0);intermittent.acknowledge(0,10);check(intermittent.poll(110)==1,"Second request");check(intermittent.poll(910)==2,"Timeout advances bounded scan");intermittent.acknowledge(2,920);check(intermittent.received()==2&&intermittent.active(),"Valid later reply resets missing streak");
  System.out.println("USER scan PASS: one-position probe, no-response exit, 256 ordered acknowledgements, pacing, partial timeout, cancellation and late replies");
 }
}
