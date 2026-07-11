import 'dart:convert';

import 'package:http/http.dart' as http;

typedef TokenProvider = Future<String?> Function({bool forceRefresh});

class MyTascoClient {
  MyTascoClient({
    required this.baseUrl,
    required this.tokenProvider,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  final String baseUrl;
  final TokenProvider tokenProvider;
  final http.Client _http;

  Future<Map<String, dynamic>> searchStaff({
    String? keyword,
    int? orgUnitId,
    int pageSize = 20,
    int currentPage = 0,
  }) async {
    return _request(
      'POST',
      '/mytasco/v1/staff/search',
      body: {
        'example': {
          if (keyword != null) 'keyword': keyword,
          if (orgUnitId != null) 'orgUnitId': orgUnitId,
          'status': 1,
        },
        'pageInfo': {'pageSize': pageSize, 'currentPage': currentPage},
      },
    );
  }

  Future<Map<String, dynamic>> organizationTree({int depth = 2}) {
    return _request('GET', '/mytasco/v1/organization/tree?depth=$depth');
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    var token = await tokenProvider(forceRefresh: false);
    var response = await _send(method, path, token: token, body: body);
    if (response.statusCode == 401 && token != null) {
      token = await tokenProvider(forceRefresh: true);
      response = await _send(method, path, token: token, body: body);
    }
    final envelope = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400 || envelope['status'] != 'success') {
      throw MyTascoApiException(
        code: envelope['code']?.toString() ?? 'internal_error',
        message: envelope['message']?.toString() ?? 'Request failed',
        requestId: envelope['requestId']?.toString(),
      );
    }
    return envelope['body'] as Map<String, dynamic>;
  }

  Future<http.Response> _send(
    String method,
    String path, {
    required String? token,
    Map<String, dynamic>? body,
  }) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'))
      ..headers.addAll({
        'Content-Type': 'application/json',
        'X-App-Code': 'MYTASCO',
        'X-Locale': 'vi-VN',
        'X-Timezone': 'Asia/Ho_Chi_Minh',
        if (token != null) 'Authorization': 'Bearer $token',
      });
    if (body != null) request.body = jsonEncode(body);
    return http.Response.fromStream(await _http.send(request));
  }
}

class MyTascoApiException implements Exception {
  MyTascoApiException({required this.code, required this.message, this.requestId});

  final String code;
  final String message;
  final String? requestId;

  @override
  String toString() => 'MyTascoApiException($code, $message, requestId: $requestId)';
}
