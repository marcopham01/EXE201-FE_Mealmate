# Context
Filename: task-file-name.md
Created: 2025-11-21 00:00
Author: AI
Protocol: RIPER-5 + Multi-Dim + Agent + AI-Dev Guide

# Task Description
Người dùng yêu cầu triển khai/deploy ứng dụng Expo React Native để xuất file APK.

# Project Overview
Ứng dụng MealMate xây dựng bằng Expo SDK 54 và React Native 0.81, cần cấu hình quy trình build APK (EAS Build hoặc CLI truyền thống) để phát hành.

---
Sections below are maintained by AI during execution.
---

# Analysis (Research)
- Đã kiểm tra `package.json`, chưa có script build APK mặc định.
- Không có thư mục `docs/` trong repo.

# Proposed Solutions (Innovation)
## Plan A:
- Principle: Sử dụng EAS Build (được Expo khuyến nghị) để tạo APK từ máy chủ Expo.
- Steps:
  1. Cài đặt `eas-cli`.
  2. Đăng nhập Expo account.
  3. Tạo `eas.json` với profile android build.
  4. Chạy `eas build -p android --profile preview` để xuất APK.
  5. Tải file từ dashboard hoặc CLI link.
- Risks:
  - Cần tài khoản Expo và cấu hình keystore.
  - Build phụ thuộc internet và quota Expo.

## Plan B:
- Principle: Dùng `expo prebuild` + `gradlew assembleRelease` để build APK cục bộ.
- Steps:
  1. Chạy `npx expo prebuild` để tạo native project.
  2. Vào `android/`, cấu hình keystore.
  3. Dùng Android Studio/Gradle build APK release.
  4. Ký và tối ưu APK thủ công.
- Risks:
  - Quy trình phức tạp, cần môi trường Android Studio.
  - Dễ phát sinh lỗi phụ thuộc native.

## Recommended Plan
Chọn Plan A vì phù hợp Expo SDK 54, nhanh và ít cấu hình phức tạp; chỉ cần EAS CLI và tài khoản Expo.

# Implementation Plan (Planning)
Implementation Checklist:
1. Tạo file `eas.json` cấu hình profile preview/release.
2. Cập nhật README hướng dẫn install EAS CLI và login.
3. Thêm bước chạy `eas build -p android --profile preview`.
4. Ghi chú cách tải APK và kiểm thử.

# Current Step
Executing: "[step 1] Tạo file cấu hình EAS"

# Task Progress
* 2025-11-21 00:00
  * Step: 0
  * Changes: Khởi tạo task file.
  * Summary: Ghi nhận bối cảnh và kế hoạch.
  * Reason: Tuân thủ template.
  * Blockers: Chưa có.
  * Status: Started

# Final Review
Pending


