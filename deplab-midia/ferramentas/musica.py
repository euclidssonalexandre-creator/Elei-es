"""Trilha de fundo própria (sintetizada aqui, sem direitos de terceiros) para os Reels do dep.rural.
Uso: python3 musica.py DURACAO_EM_SEGUNDOS saida.wav
Lo-fi calmo em lá menor (Am - F - C - G), 92 bpm, com pad, arpejo, bumbo e chimbal suaves."""
import sys, wave
import numpy as np

SR = 48000
dur = float(sys.argv[1]); out = sys.argv[2]
n = int(dur * SR) + SR
t = np.arange(n) / SR
beat = 60 / 92
bar = 4 * beat

def hz(note):  # nome MIDI -> Hz
    return 440.0 * 2 ** ((note - 69) / 12)

# acordes (MIDI): baixo + tríade
chords = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [55, 60, 64]), (43, [55, 59, 62])]
mix = np.zeros(n)

# pad: cada acorde dura um compasso, com transição suave
for k in range(int(dur / bar) + 2):
    bass, notes = chords[k % 4]
    s0 = int(k * bar * SR); s1 = min(n, int((k + 1) * bar * SR + 0.4 * SR))
    if s0 >= n: break
    tt = t[s0:s1] - t[s0]
    env = np.minimum(1, tt / 0.35) * np.minimum(1, np.maximum(0, (bar + 0.4 - tt) / 0.4))
    v = np.zeros_like(tt)
    for m in notes:
        f = hz(m)
        v += np.sin(2*np.pi*f*tt) + np.sin(2*np.pi*f*1.002*tt) * 0.6 + 0.12*np.sin(2*np.pi*2*f*tt)
    v = v * 0.035 + 0.11 * np.sin(2*np.pi*hz(bass)*tt)
    mix[s0:s1] += v * env

# arpejo em colcheias, uma oitava acima
pattern = [0, 1, 2, 1]
step = beat / 2
for j in range(int(dur / step) + 1):
    s0 = int(j * step * SR)
    if s0 >= n: break
    bass, notes = chords[int(j * step / bar) % 4]
    m = notes[pattern[j % 4]] + 12 + (12 if j % 8 == 7 else 0)
    L = min(n - s0, int(0.6 * SR)); tt = t[:L]
    tone = np.sin(2*np.pi*hz(m)*tt) + 0.25*np.sin(2*np.pi*3*hz(m)*tt)
    mix[s0:s0+L] += 0.05 * tone * np.exp(-tt / 0.16)

# bumbo nos tempos 1 e 3, chimbal nos contratempos
rng = np.random.default_rng(7)
for j in range(int(dur / beat) + 1):
    s0 = int(j * beat * SR)
    if s0 >= n: break
    if j % 2 == 0:
        L = min(n - s0, int(0.3 * SR)); tt = t[:L]
        f = 45 + 70 * np.exp(-tt / 0.04)
        mix[s0:s0+L] += 0.32 * np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt / 0.13)
    h0 = s0 + int(beat / 2 * SR)
    if h0 < n:
        L = min(n - h0, int(0.05 * SR)); noise = np.diff(rng.standard_normal(L + 1))
        mix[h0:h0+L] += 0.012 * noise * np.exp(-t[:L] / 0.012)

mix = mix[:int(dur * SR)]
mix = np.tanh(mix * 1.1) / 1.1
mix *= 0.55 / (np.max(np.abs(mix)) + 1e-9)
fi, fo = int(0.3 * SR), int(1.6 * SR)
mix[:fi] *= np.linspace(0, 1, fi); mix[-fo:] *= np.linspace(1, 0, fo)
stereo = np.stack([mix, np.roll(mix, int(0.012 * SR))], axis=1)
pcm = (np.clip(stereo, -1, 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
