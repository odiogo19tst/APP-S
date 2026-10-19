package com.dodigital.dolive;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.os.Handler;
import android.os.Looper;
import android.util.Size;
import android.view.Surface;
import android.view.TextureView;

import java.util.Collections;

final class CameraSurface extends TextureView implements TextureView.SurfaceTextureListener {
    private final Activity activity;
    private CameraDevice camera;
    private CameraCaptureSession session;
    private boolean front = true;
    private boolean stopped = false;
    private String lastError = "";
    private final Handler main = new Handler(Looper.getMainLooper());

    CameraSurface(Activity activity) {
        super(activity);
        this.activity = activity;
        setSurfaceTextureListener(this);
    }

    void restart(boolean preferFront) {
        front = preferFront;
        stopped = false;
        closeDevice();
        if (isAvailable()) open();
    }

    void open() {
        stopped = false;
        if (!isAvailable() || camera != null || activity.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) return;
        try {
            CameraManager manager = (CameraManager) activity.getSystemService(Context.CAMERA_SERVICE);
            String chosen = null;
            for (String id : manager.getCameraIdList()) {
                Integer facing = manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING);
                if (facing != null && facing == (front ? CameraCharacteristics.LENS_FACING_FRONT : CameraCharacteristics.LENS_FACING_BACK)) {
                    chosen = id; break;
                }
            }
            if (chosen == null && manager.getCameraIdList().length > 0) chosen = manager.getCameraIdList()[0];
            if (chosen == null) { lastError = "Sem câmera disponível"; return; }
            final String cameraId = chosen;
            manager.openCamera(cameraId, new CameraDevice.StateCallback() {
                @Override public void onOpened(CameraDevice device) {
                    if (stopped) { device.close(); return; }
                    camera = device;
                    startPreview(manager, cameraId);
                }
                @Override public void onDisconnected(CameraDevice device) { device.close(); camera = null; }
                @Override public void onError(CameraDevice device, int error) { lastError = "Falha na câmera: " + error; device.close(); camera = null; }
            }, main);
        } catch (CameraAccessException | SecurityException e) { lastError = e.getMessage(); }
    }

    private void startPreview(CameraManager manager, String id) {
        if (camera == null || !isAvailable()) return;
        try {
            StreamConfigurationMap map = manager.getCameraCharacteristics(id).get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
            Size choice = new Size(1280, 720);
            if (map != null && map.getOutputSizes(SurfaceTexture.class) != null) {
                Size[] sizes = map.getOutputSizes(SurfaceTexture.class);
                if (sizes.length > 0) {
                    choice = sizes[0];
                    for (Size candidate : sizes) {
                        if (candidate.getWidth() >= 640 && candidate.getWidth() <= 1920 && candidate.getWidth() >= choice.getWidth() / 2) {
                            choice = candidate;
                            if (candidate.getWidth() == 1280 && candidate.getHeight() == 720) break;
                        }
                    }
                }
            }
            SurfaceTexture texture = getSurfaceTexture();
            if (texture == null) return;
            texture.setDefaultBufferSize(choice.getWidth(), choice.getHeight());
            Surface surface = new Surface(texture);
            CaptureRequest.Builder builder = camera.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
            builder.addTarget(surface);
            builder.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_VIDEO);
            camera.createCaptureSession(Collections.singletonList(surface), new CameraCaptureSession.StateCallback() {
                @Override public void onConfigured(CameraCaptureSession configured) {
                    if (camera == null || stopped) { configured.close(); return; }
                    session = configured;
                    try { session.setRepeatingRequest(builder.build(), null, main); }
                    catch (CameraAccessException | IllegalStateException e) { lastError = e.getMessage(); }
                }
                @Override public void onConfigureFailed(CameraCaptureSession configured) { lastError = "A prévia da câmera falhou"; configured.close(); }
            }, main);
        } catch (CameraAccessException | IllegalStateException e) { lastError = e.getMessage(); }
    }

    String error() { return lastError; }
    void shutdown() { stopped = true; closeDevice(); }
    private void closeDevice() {
        if (session != null) { try { session.close(); } catch (Exception ignored) { } session = null; }
        if (camera != null) { try { camera.close(); } catch (Exception ignored) { } camera = null; }
    }
    @Override public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) { open(); }
    @Override public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) { }
    @Override public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) { shutdown(); return true; }
    @Override public void onSurfaceTextureUpdated(SurfaceTexture surface) { }
}
