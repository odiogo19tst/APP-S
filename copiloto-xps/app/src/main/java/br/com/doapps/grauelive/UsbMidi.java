package br.com.doapps.grauelive;
import android.content.Context;
import android.media.midi.*;
import android.os.Handler;
import android.os.Looper;
import java.io.IOException;
public final class UsbMidi implements AutoCloseable {
 public interface Listener {void status(String s);void event(int s,int a,int b);default void sysex(byte[] p){} default void eventAt(long receivedNs,int s,int a,int b){event(s,a,b);}}
 private final MidiManager manager; private final Listener listener;
 private volatile MidiInputPort sendPort; private MidiDevice device;private volatile MidiOutputPort port;private volatile int generation; private long receivedNs;
 private boolean opening=false; private int openingId=-1;
 private final Handler handler=new Handler(Looper.getMainLooper());
 private final MidiStream parser; private final XpsProtocol.Stream sysex;
 private final MidiManager.DeviceCallback callback=new MidiManager.DeviceCallback(){
  public void onDeviceAdded(MidiDeviceInfo info){
   if(info.getType()!=MidiDeviceInfo.TYPE_USB||info.getInputPortCount()<1||info.getOutputPortCount()<1)return;
   handler.postDelayed(()->{if(device==null&&!opening&&devices().length==1)connect(info);},450);
  }
  public void onDeviceRemoved(MidiDeviceInfo info){if((device!=null&&device.getInfo().getId()==info.getId())||(opening&&openingId==info.getId())){disconnect();listener.status("USB desconectado");}}
 };
 public UsbMidi(Context context,Listener l){listener=l;sysex=new XpsProtocol.Stream(p->handler.post(()->listener.sysex(p)));parser=new MidiStream((s,a,b)->listener.eventAt(receivedNs,s,a,b));manager=(MidiManager)context.getSystemService(Context.MIDI_SERVICE);if(manager!=null)manager.registerDeviceCallback(callback,handler);}
 public MidiDeviceInfo[] devices(){if(manager==null)return new MidiDeviceInfo[0];return java.util.Arrays.stream(manager.getDevices()).filter(d->d.getType()==MidiDeviceInfo.TYPE_USB&&d.getOutputPortCount()>0&&d.getInputPortCount()>0).toArray(MidiDeviceInfo[]::new);}
 public void connect(MidiDeviceInfo info){
  if(manager==null||info==null){listener.status("USB-MIDI indisponível");return;}
  if(opening)return; // Avoid racing the automatic probe with a manual connection.
  listener.status("Conectando USB…");disconnect();opening=true;openingId=info.getId();final int request=generation;manager.openDevice(info,d->{
  if(request!=generation){if(d!=null)try{d.close();}catch(IOException ignored){}return;}
  opening=false;openingId=-1;
  if(d==null){listener.status("Não foi possível abrir o dispositivo");return;}device=d;port=d.openOutputPort(0);sendPort=d.openInputPort(0);
  if(port==null||sendPort==null){disconnect();listener.status("Entrada ou saída USB-MIDI indisponível.");return;}
  port.connect(new MidiReceiver(){public void onSend(byte[] b,int o,int n,long t){if(request!=generation)return;long now=System.nanoTime();receivedNs=t>0&&t<=now&&now-t<1_000_000_000L?t:now;parser.feed(b,o,n);sysex.feed(b,o,n);}});
  listener.status("USB conectado • entrada/saída MIDI disponíveis. Verificando SysEx…");
 },handler);}
 public boolean send(byte[] bytes){MidiInputPort target=sendPort;if(target==null)return false;try{target.send(bytes,0,bytes.length);return true;}catch(IOException e){return false;}}
 /** Active USB device ID, for restoring the same MIDI input/output pair on refresh. */
 public int connectedDeviceId(){return device!=null&&isConnected()?device.getInfo().getId():-1;}
 public boolean isConnected(){return sendPort!=null&&port!=null;}
 public boolean sendProgram(int channel,int program){
  MidiInputPort target=sendPort;
  if(target==null||channel<1||channel>16||program<0||program>127)return false;
  try{target.send(new byte[]{(byte)(0xc0+channel-1),(byte)program},0,2);return true;}
  catch(IOException e){return false;}
 }
 public boolean send(int status,int a,int b){MidiInputPort target=sendPort;if(target==null)return false;try{target.send(new byte[]{(byte)status,(byte)a,(byte)b},0,3);return true;}catch(IOException e){return false;}}
 public void disconnect(){generation++;opening=false;openingId=-1;if(sendPort!=null)try{sendPort.close();}catch(IOException ignored){}sendPort=null;if(port!=null)try{port.close();}catch(IOException ignored){}if(device!=null)try{device.close();}catch(IOException ignored){}port=null;device=null;parser.reset();sysex.reset();}
 public void close(){disconnect();if(manager!=null)manager.unregisterDeviceCallback(callback);}
}
