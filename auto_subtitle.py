#!/usr/bin/env python3
"""
Otomatik Altyazı ve Video Düzenleyici (OpenAI Whisper + FFmpeg)
Ses dosyasındaki konuşmaları otomatik algılar, Türkçe altyazı üretir ve videoya gömer.
"""

import os
import sys
import subprocess
import argparse

def format_timestamp(seconds: float) -> str:
    """Saniyeyi SRT zaman formatına (00:00:00,000) dönüştürür."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def transcribe_audio_whisper(audio_path: str, output_srt: str, language: str = "tr", model_size: str = "base"):
    """Whisper kullanarak ses dosyasını dinler ve .srt altyazı dosyası üretir."""
    print(f"\n🧠 1/3: Yapay Zeka (Whisper) sesi dinliyor ve altyazıyı çıkarıyor...")
    print(f"   Ses Dosyası: {audio_path}")
    print(f"   Dil: {language.upper()} | Model: {model_size}")

    try:
        from faster_whisper import WhisperModel
        print("   -> 'faster-whisper' kullanılıyor (yüksek hız)...")
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        segments, info = model.transcribe(audio_path, language=language if language != "auto" else None)

        with open(output_srt, "w", encoding="utf-8") as f:
            for idx, segment in enumerate(segments, start=1):
                start_str = format_timestamp(segment.start)
                end_str = format_timestamp(segment.end)
                text = segment.text.strip()
                f.write(f"{idx}\n{start_str} --> {end_str}\n{text}\n\n")
                print(f"   [{start_str} --> {end_str}] {text}")

    except ImportError:
        try:
            import whisper
            print("   -> 'openai-whisper' kullanılıyor...")
            model = whisper.load_model(model_size)
            result = model.transcribe(audio_path, language=language if language != "auto" else None)

            with open(output_srt, "w", encoding="utf-8") as f:
                for idx, segment in enumerate(result["segments"], start=1):
                    start_str = format_timestamp(segment["start"])
                    end_str = format_timestamp(segment["end"])
                    text = segment["text"].strip()
                    f.write(f"{idx}\n{start_str} --> {end_str}\n{text}\n\n")
                    print(f"   [{start_str} --> {end_str}] {text}")

        except ImportError:
            print("\n❌ Whisper kütüphanesi bulunamadı!")
            print("Lütfen şu komutu çalıştırın:\n   pip install faster-whisper")
            sys.exit(1)

    print(f"✅ Altyazı başarıyla oluşturuldu: {output_srt}")

def burn_subtitles_ffmpeg(video_path: str, audio_path: str, srt_path: str, output_path: str, replace_audio: bool = True):
    """FFmpeg ile altyazıyı ve sesi videoya gömer."""
    print(f"\n🎬 2/3: FFmpeg ile video işleniyor ve altyazı videoya gömülüyor...")

    escaped_srt = srt_path.replace("\\", "/").replace(":", "\\:")
    # Altyazı stilini şık (Instagram/Reels tarzı sarı/beyaz kalın yazı, siyah konturlu) yapalım
    sub_style = "force_style='FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=30'"
    vf_filter = f"subtitles='{escaped_srt}':{sub_style}"

    if audio_path and replace_audio:
        # Orijinal sesi kapat, yeni sesi koy ve altyazıyı göm
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-vf", vf_filter,
            "-c:v", "libx264",
            "-c:a", "aac",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            output_path
        ]
    elif audio_path and not replace_audio:
        # Sesi karıştır ve altyazıyı göm
        filter_complex = f"[1:a]volume=0.3[music];[0:a][music]amix=inputs=2:duration=first[aout]"
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-filter_complex", filter_complex,
            "-vf", vf_filter,
            "-map", "0:v",
            "-map", "[aout]",
            output_path
        ]
    else:
        # Sadece altyazıyı göm
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vf", vf_filter,
            "-c:a", "copy",
            output_path
        ]

    cmd_str = " ".join(f'"{c}"' if " " in c or ":" in c else c for c in cmd)
    print(f"   Komut: {cmd_str}\n")
    res = subprocess.run(cmd)

    if res.returncode == 0:
        print(f"\n🎉 3/3: Bitti! Videonuz hazır:")
        print(f"   📍 {output_path}")
    else:
        print(f"\n❌ FFmpeg video oluştururken bir hata ile karşılaştı.")

def main():
    parser = argparse.ArgumentParser(description="Otomatik Yapay Zeka Altyazı ve Video Düzenleyici")
    parser.add_argument("-v", "--video", required=True, help="Video dosya yolu (.mp4)")
    parser.add_argument("-a", "--audio", help="Ses dosya yolu (.mp3 / .wav) (Opsiyonel)")
    parser.add_argument("-o", "--output", default="output_altyazili.mp4", help="Çıkış video dosya yolu")
    parser.add_argument("-m", "--model", default="base", choices=["tiny", "base", "small", "medium"], help="Whisper model boyutu (varsayılan: base)")
    parser.add_argument("-l", "--lang", default="tr", help="Dil kodu (tr, en, auto vb.)")
    parser.add_argument("--keep-audio", action="store_true", help="Videonun orijinal sesini silmek yerine karıştır")

    args = parser.parse_args()

    # Eğer ayrı bir ses dosyası verilmediyse videonun kendi sesinden altyazı çıkar
    source_audio = args.audio if args.audio else args.video
    temp_srt = os.path.splitext(args.output)[0] + "_temp.srt"

    transcribe_audio_whisper(source_audio, temp_srt, language=args.lang, model_size=args.model)
    burn_subtitles_ffmpeg(args.video, args.audio, temp_srt, args.output, replace_audio=not args.keep_audio)

    # İsteğe bağlı geçici SRT dosyasını koru veya sil
    print(f"ℹ️ Oluşturulan altyazı dosyası da saklandı: {temp_srt}")

if __name__ == "__main__":
    main()
