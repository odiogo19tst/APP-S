package br.com.doapps.grauelive;
/** Request/acknowledgement pacing for the 256 USER names. No Android dependency. */
public final class UserToneReadSession {
 public static final int TOTAL=256;
 private boolean active=true;private int next=0,pending=-1,sent=0,received=0,misses=0;private long deadline,nextAt;private String reason="";
 public UserToneReadSession(long now){nextAt=now;}
 public boolean active(){return active;} public int sent(){return sent;} public int received(){return received;} public int pending(){return pending;}public String reason(){return reason;}
 public int poll(long now){
  if(!active)return -1;
  if(pending>=0){if(now<deadline)return -1;if(pending==0){stop("A primeira posição USER não respondeu. Varredura interrompida; cache preservado.");return -1;}pending=-1;misses++;if(misses>=4){stop("Quatro posições USER seguidas sem resposta. Leitura parcial interrompida; cache preservado.");return -1;}nextAt=now;}
  if(next>=TOTAL){stop("Leitura USER concluída.");return -1;}
  if(now<nextAt)return -1;
  pending=next++;sent++;deadline=now+(pending==0?1200:800);return pending;
 }
 public boolean acknowledge(int index,long now){if(!active||index!=pending||pending<0)return false;received++;misses=0;pending=-1;nextAt=now+100;return true;}
 public void cancel(){stop("Leitura USER interrompida pelo usuário; cache preservado.");}
 private void stop(String text){active=false;pending=-1;reason=text;}
}
