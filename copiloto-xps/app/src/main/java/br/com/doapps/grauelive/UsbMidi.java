package br.com.doapps.grauelive;
import android.content.Context;
import android.media.midi.*;
import android.os.Handler;
import android.os.Looper;
import java.io.IOException;
public final class UsbMidi implements AutoCloseable {
 public interface Listener {void status(String s);void event(int s,int a,int b);}
 private final MidiManager manager; private final Listener listener;
 private MidiDevice device;private MidiOutputPort port;private int generation;
 private final Handler handler=new Handler(Looper.getMainLooper());
 private final MidiStream parser;
 private final MidiManager.DeviceCallback callback=new MidiManager.DeviceCallback(){
  public void onDeviceRemoved(MidiDeviceInfo info){if(device!=null&&device.getInfo().getId()==info.getId()){disconnect();listener.status("USB desconectado");}}
 };
 public UsbMidi(Context context,Listener l){listener=l;parser=new MidiStream((s,a,b)->handler.post(()->listener.event(s,a,b)));manager=(MidiManager)context.getSystemService(Context.MIDI_SERVICE);if(manager!=null)manager.registerDeviceCallback(callback,handler);}
 public MidiDeviceInfo[] devices(){if(manager==null)return new MidiDeviceInfo[0];return java.util.Arrays.stream(manager.getDevices()).filter(d->d.getType()==MidiDeviceInfo.TYPE_USB&&d.getOutputPortCount()>0).toArray(MidiDeviceInfo[]::new);}
 public void connect(MidiDeviceInfo info){disconnect();final int request= generation;listener.status("Conectando USB…");manager.openDevice(info,d->{
  if(request!=generation){if(d!=null)try{d.close();}catch(IOException ignored){}return;}
  if(d==null){listener.status("Não foi possível abrir o dispositivo");return;}device=d;port=d.openOutputPort(0);
  if(port==null){disconnect();listener.status("Porta MIDI indisponível");return;}
  port.connect(new MidiReceiver(){public void onSend(byte[] b,int o,int n,long t){parser.feed(b,o,n);}});
  listener.status("USB conectado • leitura de notas ativa");
 },handler);}
 public void disconnect(){generation++;if(port!=null)try{port.close();}catch(IOException ignored){}if(device!=null)try{device.close();}catch(IOException ignored){}port=null;device=null;parser.reset();}
 public void close(){disconnect();if(manager!=null)manager.unregisterDeviceCallback(callback);}
}
